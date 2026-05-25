import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory and reservation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`} style={{ background: "#0a0a0a" }}>
        <nav style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, background: "#6366f1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>A</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Allo Inventory</span>
          </a>
          <span style={{ fontSize: 11, color: "#444", background: "#111", border: "1px solid #1f1f1f", padding: "4px 12px", borderRadius: 20 }}>
            Inventory · Reservations · Fulfillment
          </span>
        </nav>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>{children}</main>
      </body>
    </html>
  );
}