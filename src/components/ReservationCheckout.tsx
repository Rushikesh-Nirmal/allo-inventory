"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ReservationData {
  id: string; stockId: string; quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string; createdAt: string;
  product: { id: string; name: string; price: number; imageUrl: string | null };
  warehouse: { id: string; name: string; location: string };
}

function useCountdown(expiresAt: string) {
  const get = useCallback(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)), [expiresAt]);
  const [s, setS] = useState(get);
  useEffect(() => {
    if (s <= 0) return;
    const t = setInterval(() => setS(get()), 1000);
    return () => clearInterval(t);
  }, [s, get]);
  return { minutes: Math.floor(s / 60), seconds: s % 60, isExpired: s === 0, isUrgent: s <= 60, pct: (s / 600) * 100 };
}

export default function ReservationCheckout({ reservation: init }: { reservation: ReservationData }) {
  const router = useRouter();
  const [reservation, setReservation] = useState(init);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { minutes, seconds, isExpired, isUrgent, pct } = useCountdown(reservation.expiresAt);

  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";

  async function handleConfirm() {
    setError(null); setLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const data = await res.json();
      if (res.status === 410) { setError("Reservation expired. Please start over."); setReservation(r => ({ ...r, status: "RELEASED" })); return; }
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setReservation(r => ({ ...r, status: "CONFIRMED" }));
    } catch { setError("Network error. Try again."); }
    finally { setLoading(null); }
  }

  async function handleCancel() {
    setError(null); setLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not cancel."); return; }
      setReservation(r => ({ ...r, status: "RELEASED" }));
    } catch { setError("Network error. Try again."); }
    finally { setLoading(null); }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>
        ← Back to products
      </button>

      <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, overflow: "hidden" }}>
        {/* Image */}
        {reservation.product.imageUrl && (
          <div style={{ height: 220, position: "relative", background: "#0d0d0d" }}>
            <Image src={reservation.product.imageUrl} alt={reservation.product.name} fill style={{ objectFit: "cover", opacity: 0.75 }} sizes="480px" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
            {/* Status chip on image */}
            <div style={{ position: "absolute", bottom: 14, left: 16 }}>
              {isConfirmed && <span style={{ background: "#022c22", color: "#34d399", border: "1px solid #065f46", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>✓ Order confirmed</span>}
              {(isReleased || (isPending && isExpired)) && <span style={{ background: "#1c0505", color: "#f87171", border: "1px solid #7f1d1d", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>Reservation ended</span>}
              {isPending && !isExpired && <span style={{ background: isUrgent ? "#1c0505" : "#1a1040", color: isUrgent ? "#f87171" : "#818cf8", border: `1px solid ${isUrgent ? "#7f1d1d" : "#3730a3"}`, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>{isUrgent ? "⚡ Hurry!" : "⏳ Reserved"}</span>}
            </div>
          </div>
        )}

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 4 }}>{reservation.product.name}</h1>
            <p style={{ fontSize: 12, color: "#444" }}>{reservation.warehouse.name} · {reservation.warehouse.location}</p>
          </div>

          {/* Countdown */}
          {isPending && !isExpired && (
            <div style={{ background: isUrgent ? "#1c0505" : "#0d0d1f", border: `1px solid ${isUrgent ? "#7f1d1d" : "#1e1b4b"}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isUrgent ? "#f87171" : "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hold expires in</span>
                <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 800, color: isUrgent ? "#f87171" : "#818cf8", letterSpacing: "-0.02em" }}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: isUrgent ? "#ef4444" : "#6366f1", borderRadius: 4, transition: "width 1s linear" }} />
              </div>
            </div>
          )}

          {/* Confirmed */}
          {isConfirmed && (
            <div style={{ background: "#022c22", border: "1px solid #065f46", borderRadius: 14, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 24 }}>🎉</div>
              <div>
                <p style={{ fontWeight: 700, color: "#34d399", fontSize: 14, marginBottom: 2 }}>Order confirmed!</p>
                <p style={{ fontSize: 12, color: "#059669" }}>Your purchase was successful. Thank you!</p>
              </div>
            </div>
          )}

          {/* Released */}
          {(isReleased || (isPending && isExpired)) && (
            <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 14, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 24 }}>{isExpired ? "⏰" : "✕"}</div>
              <div>
                <p style={{ fontWeight: 700, color: "#888", fontSize: 14, marginBottom: 2 }}>Reservation ended</p>
                <p style={{ fontSize: 12, color: "#444" }}>{isExpired ? "Hold expired. Units are back in stock." : "This reservation was cancelled."}</p>
              </div>
            </div>
          )}

          {/* Order summary */}
          <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Order summary</p>
            {[
              { label: "Quantity", value: String(reservation.quantity) },
              { label: "Unit price", value: `₹${reservation.product.price.toLocaleString("en-IN")}` },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#555" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>{row.value}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "#1a1a1a", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#6366f1", letterSpacing: "-0.02em" }}>
                ₹{(reservation.product.price * reservation.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && <p style={{ fontSize: 12, color: "#f87171", background: "#1c0505", border: "1px solid #7f1d1d", borderRadius: 10, padding: "10px 14px", margin: 0 }}>{error}</p>}

          {/* Actions */}
          {isPending && !isExpired && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleConfirm} disabled={loading !== null}
                style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading === "confirm" ? "Processing…" : "Confirm Purchase"}
              </button>
              <button onClick={handleCancel} disabled={loading !== null}
                style={{ flex: 1, background: "#141414", color: "#888", border: "1px solid #222", borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading === "cancel" ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          )}

          {(isConfirmed || isReleased) && (
            <button onClick={() => router.push("/")}
              style={{ width: "100%", background: "#141414", color: "#888", border: "1px solid #222", borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Back to Products
            </button>
          )}
        </div>
      </div>
    </div>
  );
}