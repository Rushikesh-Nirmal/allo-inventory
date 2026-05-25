import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data in correct order
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  // --- Warehouses ---
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, MH" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "New Delhi, DL" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Hub", location: "Bangalore, KA" },
  });

  console.log("✅ Warehouses created");

  // --- Products ---
  const sneakers = await prisma.product.create({
    data: {
      name: "Air Runner Pro",
      description: "Lightweight running shoes with responsive cushioning.",
      price: 4999,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    },
  });

  const backpack = await prisma.product.create({
    data: {
      name: "Urban Backpack 30L",
      description: "Durable everyday backpack with laptop sleeve.",
      price: 2499,
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    },
  });

  const headphones = await prisma.product.create({
    data: {
      name: "Studio Headphones X1",
      description: "Over-ear headphones with active noise cancellation.",
      price: 8999,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    },
  });

  const watch = await prisma.product.create({
    data: {
      name: "Smart Watch Series 5",
      description: "Health tracking smartwatch with 7-day battery life.",
      price: 12999,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    },
  });

  console.log("✅ Products created");

  // --- Stock (product × warehouse) ---
  await prisma.stock.createMany({
    data: [
      // Air Runner Pro
      { productId: sneakers.id, warehouseId: mumbai.id, total: 10, reserved: 0 },
      { productId: sneakers.id, warehouseId: delhi.id, total: 5, reserved: 0 },
      { productId: sneakers.id, warehouseId: bangalore.id, total: 2, reserved: 0 },

      // Urban Backpack
      { productId: backpack.id, warehouseId: mumbai.id, total: 20, reserved: 0 },
      { productId: backpack.id, warehouseId: delhi.id, total: 8, reserved: 0 },

      // Studio Headphones (low stock to demo 409)
      { productId: headphones.id, warehouseId: mumbai.id, total: 3, reserved: 0 },
      { productId: headphones.id, warehouseId: bangalore.id, total: 1, reserved: 0 },

      // Smart Watch
      { productId: watch.id, warehouseId: delhi.id, total: 15, reserved: 0 },
      { productId: watch.id, warehouseId: bangalore.id, total: 6, reserved: 0 },
    ],
  });

  console.log("✅ Stock entries created");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
