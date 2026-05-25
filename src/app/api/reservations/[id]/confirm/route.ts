import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  const { statusCode, body } = await withIdempotency(idempotencyKey, async () => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { stock: true },
    });

    if (!reservation) return { statusCode: 404, body: { error: "Reservation not found" } };
    if (reservation.status === "CONFIRMED") return { statusCode: 200, body: { message: "Already confirmed", reservationId: id } };
    if (reservation.status === "RELEASED") return { statusCode: 410, body: { error: "Reservation was already released" } };

    if (new Date() > reservation.expiresAt) {
      await prisma.$transaction([
        prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
        prisma.stock.update({ where: { id: reservation.stockId }, data: { reserved: { decrement: reservation.quantity } } }),
      ]);
      return { statusCode: 410, body: { error: "Reservation has expired. Please start over." } };
    }

    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: "CONFIRMED" } }),
      prisma.stock.update({ where: { id: reservation.stockId }, data: { reserved: { decrement: reservation.quantity }, total: { decrement: reservation.quantity } } }),
    ]);

    return { statusCode: 200, body: { message: "Reservation confirmed", reservationId: id } };
  });

  return NextResponse.json(body, { status: statusCode });
}