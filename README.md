# Allo Inventory — Take-Home Exercise

A Next.js inventory and reservation platform for multi-warehouse retail. Customers can reserve items during checkout, preventing overselling without locking up stock for abandoned carts.

**Live URL:** https://allo-inventory-one-iota.vercel.app  
**GitHub:** https://github.com/Rushikesh-Nirmal/allo-inventory

---

## How to run locally

### 1. Clone and install

```bash

### 2. Set up environment variables

Create a `.env` file with:

DATABASE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET

### 3. Run migrations and seed

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## How concurrency safety works

The core problem: two simultaneous requests for the last unit of a SKU must not both succeed.

**Solution: `SELECT ... FOR UPDATE` inside a Postgres transaction.**

```sql
BEGIN;
  SELECT id, total, reserved FROM "Stock" WHERE id = $1 FOR UPDATE;
  UPDATE "Stock" SET reserved = reserved + $2 WHERE id = $1;
  INSERT INTO "Reservation" ...;
COMMIT;
```

- `FOR UPDATE` acquires an exclusive row-level lock in Postgres
- Concurrent transactions queue up; each sees the committed state of the previous
- The second request reads `available = 0` and correctly returns 409
- No race condition is possible — the check and increment are atomic

---

## How reservation expiry works in production

Two-layer approach:

**Layer 1 — Lazy expiry on confirm:** When `/confirm` is called, the server checks `expiresAt` before acting. If expired, releases the reservation and returns `410 Gone`.

**Layer 2 — Vercel Cron (optional):** `vercel.json` can schedule a cleanup job. On the free tier, lazy expiry alone is sufficient.

---

## How idempotency works

If a client sends the same `Idempotency-Key` header on a retry, the server returns the original response without repeating the side effect.

**Implemented for:** `POST /api/reservations` and `POST /api/reservations/:id/confirm`

1. Client generates a UUID → attaches as `Idempotency-Key` header
2. Server checks Upstash Redis for that key
3. Cache hit → return stored response immediately
4. Cache miss → run handler, store result in Redis (24hr TTL), return it

---

## Data model

Product ──< Stock >── Warehouse
│
└──< Reservation

- `Stock.total` — physical units in the warehouse
- `Stock.reserved` — units held by PENDING reservations
- `Stock.available` (computed) = `total - reserved`
- On **confirm**: `reserved -= qty`, `total -= qty`
- On **release/expire**: `reserved -= qty` only

---

## Trade-offs and things I'd do differently

**What I'd add with more time:**
- Real-time stock updates via WebSocket/SSE
- User authentication
- Quantity selector (currently hardcoded to 1)
- Mock payment step
- Metrics and monitoring

**Conscious decisions:**
- `SELECT FOR UPDATE` over Redis locking — correctness in the DB, no extra infra
- Lazy expiry as primary mechanism — reliable without a persistent worker
- Server Components for initial data fetch — no client loading states
- `available` computed not stored — avoids sync bugs

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | Products with available stock per warehouse |
| GET | `/api/warehouses` | All warehouses |
| POST | `/api/reservations` | Create reservation. `409` if insufficient stock. Supports `Idempotency-Key` |
| POST | `/api/reservations/:id/confirm` | Confirm payment. `410` if expired. Supports `Idempotency-Key` |
| POST | `/api/reservations/:id/release` | Release early (cancelled/failed) |
| GET | `/api/cron/expire-reservations` | Cleanup expired reservations. Requires `Authorization: Bearer <CRON_SECRET>` |