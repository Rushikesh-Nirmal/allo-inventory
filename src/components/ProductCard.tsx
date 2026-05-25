"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface StockEntry {
  id: string; warehouseId: string; warehouseName: string;
  warehouseLocation: string; total: number; reserved: number; available: number;
}
interface Product {
  id: string; name: string; description: string | null;
  imageUrl: string | null; price: number; stock: StockEntry[];
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [selectedStockId, setSelectedStockId] = useState(product.stock[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const sel = product.stock.find((s) => s.id === selectedStockId);
  const outOfStock = !sel || sel.available === 0;

  async function handleReserve() {
    if (!selectedStockId || !sel) return;
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ stockId: selectedStockId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.status === 409) { setError("Not enough stock available."); return; }
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(`/reservations/${data.id}`);
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#111", border: `1px solid ${hovered ? "#2a2a2a" : "#1a1a1a"}`,
        borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "border-color 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Image */}
      <div style={{ height: 160, background: "#0d0d0d", position: "relative", overflow: "hidden" }}>
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill
            style={{ objectFit: "cover", opacity: 0.8, transition: "transform 0.4s", transform: hovered ? "scale(1.05)" : "scale(1)" }}
            sizes="300px" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 40 }}>📦</div>
        )}
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
        {/* Badge */}
        {sel && (
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            {sel.available === 0 ? (
              <span style={{ background: "#1c0505", color: "#f87171", border: "1px solid #7f1d1d", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>Out of stock</span>
            ) : sel.available <= 3 ? (
              <span style={{ background: "#1c0a00", color: "#fb923c", border: "1px solid #7c2d12", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>Only {sel.available} left</span>
            ) : (
              <span style={{ background: "#022c22", color: "#34d399", border: "1px solid #065f46", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>In stock</span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 14px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{product.name}</h2>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#6366f1", whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </span>
        </div>

        {product.description && (
          <p style={{ fontSize: 11, color: "#444", lineHeight: 1.5, margin: 0 }}>{product.description}</p>
        )}

        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Warehouse</label>
          <select
            value={selectedStockId}
            onChange={(e) => { setSelectedStockId(e.target.value); setError(null); }}
            style={{ width: "100%", background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, color: "#888", fontSize: 12, padding: "7px 10px", outline: "none" }}
          >
            {product.stock.map((s) => (
              <option key={s.id} value={s.id} disabled={s.available === 0}>
                {s.warehouseName} · {s.available > 0 ? `${s.available} units` : "Out of stock"}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p style={{ fontSize: 11, color: "#f87171", background: "#1c0505", border: "1px solid #7f1d1d", borderRadius: 8, padding: "6px 10px", margin: 0 }}>{error}</p>
        )}

        <button
          onClick={handleReserve}
          disabled={loading || outOfStock}
          style={{
            marginTop: "auto", width: "100%", padding: "10px",
            background: outOfStock ? "#1a1a1a" : "#6366f1",
            color: outOfStock ? "#444" : "#fff",
            border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: outOfStock ? "not-allowed" : "pointer",
            letterSpacing: "0.01em", transition: "background 0.15s",
          }}
        >
          {loading ? "Reserving…" : outOfStock ? "Out of stock" : "Reserve Now →"}
        </button>
      </div>
    </div>
  );
}