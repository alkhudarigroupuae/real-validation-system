import { getServerEnv } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, Bucket>();

export const checkRateLimit = (key: string): { ok: boolean; retryAfterMs: number } => {
  const env = getServerEnv();
  const now = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + env.RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  memoryStore.set(key, bucket);
  return { ok: true, retryAfterMs: 0 };
};
