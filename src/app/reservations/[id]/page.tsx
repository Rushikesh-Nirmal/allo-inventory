import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReservationCheckout from "@/components/ReservationCheckout";

export const dynamic = "force-dynamic";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      stock: {
        include: {
          product: true,
          warehouse: true,
        },
      },
    },
  });

  if (!reservation) notFound();

  const data = {
    id: reservation.id,
    stockId: reservation.stockId,
    quantity: reservation.quantity,
    status: reservation.status as "PENDING" | "CONFIRMED" | "RELEASED",
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    product: {
      id: reservation.stock.product.id,
      name: reservation.stock.product.name,
      price: reservation.stock.product.price,
      imageUrl: reservation.stock.product.imageUrl,
    },
    warehouse: {
      id: reservation.stock.warehouse.id,
      name: reservation.stock.warehouse.name,
      location: reservation.stock.warehouse.location,
    },
  };

  return <ReservationCheckout reservation={data} />;
}