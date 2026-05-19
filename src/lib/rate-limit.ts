/**
 * Fixed-window rate limiter with two backends.
 *
 * Default (no env config) : in-memory Map. Vercel functions are stateless
 * across cold starts and regions, so this is per-instance — enough to stop
 * accidental spam loops but not a determined attacker.
 *
 * Production-grade (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set) :
 * Upstash Redis via REST API. Counter is global across instances. We use
 * INCR + EXPIRE NX in a pipeline so the first request in a window sets the
 * TTL and subsequent requests just bump the counter.
 *
 * The API is async to accommodate the Redis network call; callers must
 * `await rateLimit(...)`.
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

// In-memory implementation — used when Upstash isn't configured AND as the
// fallback when an Upstash call fails (network blip shouldn't 500 the user).
export function _rateLimitInMemory(
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

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

// Upstash Redis pipeline call returning the raw command results.
async function pipelineUpstash(cmds: Array<Array<string | number>>): Promise<unknown[]> {
  const url = `${process.env.UPSTASH_REDIS_REST_URL!.replace(/\/+$/, '')}/pipeline`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmds),
    cache: 'no-store',
    // Short timeout — never let rate-limiting wait longer than the request
    // it protects. AbortSignal.timeout is Node 18+ and fine in the Edge
    // runtime + Vercel functions.
    signal: AbortSignal.timeout(2_500),
  })
  if (!res.ok) {
    throw new Error(`Upstash pipeline ${res.status}`)
  }
  // Upstash returns `[{ result: ... } | { error: ... }, ...]`.
  return (await res.json()) as unknown[]
}

async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  // Namespace the key so we don't collide with anything else the user might
  // have in their Upstash db. Hash-style separator chosen to match common
  // Redis conventions.
  const redisKey = `rl:${key}`

  const responses = await pipelineUpstash([
    ['INCR', redisKey],
    ['EXPIRE', redisKey, windowSec, 'NX'],
    ['PTTL', redisKey],
  ])

  // Defensive parse — any non-numeric result means we should fail open
  // (allow) rather than 500 the request. Upstash error payloads have shape
  // { error: string }.
  const incrEntry = responses[0] as { result?: number; error?: string } | undefined
  const pttlEntry = responses[2] as { result?: number; error?: string } | undefined
  const count = typeof incrEntry?.result === 'number' ? incrEntry.result : 0
  const pttlMs = typeof pttlEntry?.result === 'number' && pttlEntry.result > 0
    ? pttlEntry.result
    : windowMs

  const resetAt = Date.now() + pttlMs
  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt }
  }
  return { allowed: true, remaining: Math.max(0, limit - count), resetAt }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!isUpstashConfigured()) {
    return _rateLimitInMemory(key, limit, windowMs)
  }
  try {
    return await rateLimitUpstash(key, limit, windowMs)
  } catch (err) {
    // Network or Upstash blip — fall back to in-memory (per-instance) rather
    // than refuse the request. Log so the operator can act on a chronic
    // outage.
    console.warn('[rate-limit] Upstash unavailable, falling back to in-memory:', err)
    return _rateLimitInMemory(key, limit, windowMs)
  }
}

/** Useful in tests to reset state between cases. */
export function _resetRateLimitForTests(): void {
  buckets.clear()
}
