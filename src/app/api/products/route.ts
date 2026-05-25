import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProductDTO } from "@/types";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      stock: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
  });

  const response: ProductDTO[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    stock: p.stock.map((s) => ({
      id: s.id,
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      warehouseLocation: s.warehouse.location,
      total: s.total,
      reserved: s.reserved,
      available: s.total - s.reserved,
    })),
  }));

  return NextResponse.json(response);
}
