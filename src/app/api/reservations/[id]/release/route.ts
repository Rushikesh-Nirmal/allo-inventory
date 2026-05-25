import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  if (reservation.status === "RELEASED") return NextResponse.json({ message: "Already released", reservationId: id });
  if (reservation.status === "CONFIRMED") return NextResponse.json({ error: "Cannot release a confirmed reservation" }, { status: 409 });

  await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
    prisma.stock.update({ where: { id: reservation.stockId }, data: { reserved: { decrement: reservation.quantity } } }),
  ]);

  return NextResponse.json({ message: "Reservation released", reservationId: id });
}