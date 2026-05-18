/**
 * In-memory rate limiter, fixed-window per key.
 *
 * Vercel functions are stateless across invocations, so this limiter is
 * effectively per-region/per-instance — not bulletproof against a determined
 * attacker. It's enough to stop accidental spam loops (the most common case)
 * and to protect Supabase quotas during a casual abuse attempt.
 *
 * For real anti-abuse we'd plug in Upstash Redis (V2). The interface here is
 * intentionally simple so swapping the backend is a 1-file change.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, fresh)
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt }
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

/** Useful in tests to reset state between cases. */
export function _resetRateLimitForTests(): void {
  buckets.clear()
}
