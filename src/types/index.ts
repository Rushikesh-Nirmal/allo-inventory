import { z } from "zod";

// ─── Request Schemas ─────────────────────────────────────────────────────────

export const CreateReservationSchema = z.object({
  stockId: z.string().min(1, "stockId is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

// ─── API Response Types ───────────────────────────────────────────────────────

export interface WarehouseDTO {
  id: string;
  name: string;
  location: string;
}

export interface StockDTO {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  total: number;
  reserved: number;
  available: number; // computed: total - reserved
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  stock: StockDTO[];
}

export interface ReservationDTO {
  id: string;
  stockId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string; // ISO string
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
