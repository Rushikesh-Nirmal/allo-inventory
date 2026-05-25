import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint is called by Vercel Cron every minute (see vercel.json).
// It finds all PENDING reservations past their expiresAt and releases them,
// returning the units to the available pool.
//
// This is a belt-and-suspenders approach — we also do lazy expiry on
// confirm/read. But the cron ensures stock isn't locked up between reads.

export async function GET(request: NextRequest) {
  // Simple auth check — Vercel Cron passes this header automatically
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all expired PENDING reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, stockId: true, quantity: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ message: "No expired reservations", released: 0 });
  }

  // Release them all in parallel batches
  // We use individual transactions so one failure doesn't block others
  const results = await Promise.allSettled(
    expired.map((r) =>
      prisma.$transaction([
        prisma.reservation.update({
          where: { id: r.id },
          data: { status: "RELEASED" },
        }),
        prisma.stock.update({
          where: { id: r.stockId },
          data: { reserved: { decrement: r.quantity } },
        }),
      ])
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[cron] Released ${succeeded} reservations, ${failed} failures`);

  return NextResponse.json({
    message: `Released ${succeeded} expired reservations`,
    released: succeeded,
    failed,
  });
}
