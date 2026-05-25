import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WarehouseDTO } from "@/types";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
  });

  const response: WarehouseDTO[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    location: w.location,
  }));

  return NextResponse.json(response);
}
