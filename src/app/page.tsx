import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      stock: { include: { warehouse: true }, orderBy: { warehouse: { name: "asc" } } },
    },
  });

  const data = products.map((p) => ({
    ...p,
    stock: p.stock.map((s) => ({ ...s, available: s.total - s.reserved })),
  }));

  const warehouseCount = [...new Set(data.flatMap((p) => p.stock.map((s) => s.warehouseId)))].length;
  const totalStock = data.reduce((sum, p) => sum + p.stock.reduce((a, s) => a + s.available, 0), 0);

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Multi-warehouse inventory
        </p>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 10 }}>
          Reserve before<br />it&apos;s gone.
        </h1>
        <p style={{ fontSize: 14, color: "#555", maxWidth: 420, lineHeight: 1.6 }}>
          Pick a product, choose a warehouse, and hold your item for 10 minutes while you complete checkout.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden", marginBottom: 36, width: "fit-content" }}>
        {[
          { val: data.length, lbl: "Products" },
          { val: warehouseCount, lbl: "Warehouses" },
          { val: totalStock, lbl: "Units available" },
          { val: "10 min", lbl: "Hold window" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 24px", borderRight: i < 3 ? "1px solid #1a1a1a" : "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {data.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}