import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";
import { CreateReservationSchema } from "@/types";
import type { ReservationDTO } from "@/types";

// How long a reservation is held before expiring
const RESERVATION_MINUTES = 10;

export async function POST(request: NextRequest) {
  // ── Parse & validate body ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { stockId, quantity } = parsed.data;

  // ── Idempotency check ──────────────────────────────────────────────────────
  const idempotencyKey = request.headers.get("Idempotency-Key");

  const { statusCode, body: responseBody } = await withIdempotency(
    idempotencyKey,
    async () => {
      // ── Core logic: reserve with SELECT FOR UPDATE ─────────────────────────
      //
      // Why SELECT FOR UPDATE?
      //   If two requests arrive simultaneously for the last unit, both read
      //   "available = 1" before either updates. Without a lock, both succeed
      //   and we oversell. With FOR UPDATE, the second transaction blocks until
      //   the first commits, then re-reads the (now updated) reserved count
      //   and correctly returns 409.
      //
      try {
        const reservation = await prisma.$transaction(async (tx) => {
          // 1. Lock the stock row — any other transaction touching this row
          //    will WAIT here until we commit or rollback.
          const rows = await tx.$queryRaw<
            Array<{
              id: string;
              total: number;
              reserved: number;
              productId: string;
              warehouseId: string;
            }>
          >`
            SELECT id, total, reserved, "productId", "warehouseId"
            FROM "Stock"
            WHERE id = ${stockId}
            FOR UPDATE
          `;

          if (rows.length === 0) {
            throw Object.assign(new Error("Stock not found"), { code: "NOT_FOUND" });
          }

          const stock = rows[0];
          const available = stock.total - stock.reserved;

          // 2. Check availability — only possible AFTER we hold the lock
          if (available < quantity) {
            throw Object.assign(new Error("Not enough stock available"), {
              code: "INSUFFICIENT_STOCK",
            });
          }

          // 3. Increment reserved count
          await tx.stock.update({
            where: { id: stockId },
            data: { reserved: { increment: quantity } },
          });

          // 4. Create the reservation record
          const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
          const newReservation = await tx.reservation.create({
            data: { stockId, quantity, status: "PENDING", expiresAt },
            include: {
              stock: {
                include: {
                  product: true,
                  warehouse: true,
                },
              },
            },
          });

          return newReservation;
        });

        const dto: ReservationDTO = {
          id: reservation.id,
          stockId: reservation.stockId,
          quantity: reservation.quantity,
          status: reservation.status as ReservationDTO["status"],
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

        return { statusCode: 201, body: dto };
      } catch (err) {
        const e = err as Error & { code?: string };
        if (e.code === "NOT_FOUND") {
          return { statusCode: 404, body: { error: "Stock entry not found" } };
        }
        if (e.code === "INSUFFICIENT_STOCK") {
          return {
            statusCode: 409,
            body: { error: "Not enough stock available for this reservation" },
          };
        }
        throw err; // unexpected error — let the outer catch handle it
      }
    }
  );

  return NextResponse.json(responseBody, { status: statusCode });
}
