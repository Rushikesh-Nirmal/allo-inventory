const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

interface CachedResponse {
  statusCode: number;
  body: unknown;
}

async function getRedis() {
  try {
    const { redis } = await import("./redis");
    return redis;
  } catch {
    return null;
  }
}

export async function withIdempotency(
  idempotencyKey: string | null,
  handler: () => Promise<{ statusCode: number; body: unknown }>
): Promise<{ statusCode: number; body: unknown; fromCache: boolean }> {
  const redis = await getRedis();

  if (idempotencyKey && redis) {
    try {
      const cached = await redis.get<CachedResponse>(`idempotency:${idempotencyKey}`);
      if (cached) return { ...cached, fromCache: true };
    } catch { /* skip cache on error */ }
  }

  const result = await handler();

  if (idempotencyKey && redis) {
    try {
      await redis.set(`idempotency:${idempotencyKey}`, { statusCode: result.statusCode, body: result.body }, { ex: IDEMPOTENCY_TTL_SECONDS });
    } catch { /* skip cache on error */ }
  }

  return { ...result, fromCache: false };
}