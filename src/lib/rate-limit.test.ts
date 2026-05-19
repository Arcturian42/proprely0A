import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, _resetRateLimitForTests } from './rate-limit'

describe('rateLimit — in-memory fallback', () => {
  beforeEach(() => {
    _resetRateLimitForTests()
    // Ensure Upstash branch is skipped for these tests.
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit('alice', 5, 60_000)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(5 - i - 1)
    }
  })

  it('rejects the (limit+1)th request inside the window', async () => {
    for (let i = 0; i < 5; i++) await rateLimit('alice', 5, 60_000)
    const r = await rateLimit('alice', 5, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    for (let i = 0; i < 5; i++) await rateLimit('alice', 5, 60_000)
    expect((await rateLimit('alice', 5, 60_000)).allowed).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect((await rateLimit('alice', 5, 60_000)).allowed).toBe(true)
  })

  it('scopes per key — alice and bob have independent buckets', async () => {
    for (let i = 0; i < 5; i++) await rateLimit('alice', 5, 60_000)
    expect((await rateLimit('alice', 5, 60_000)).allowed).toBe(false)
    expect((await rateLimit('bob', 5, 60_000)).allowed).toBe(true)
  })
})

describe('rateLimit — Upstash backend', () => {
  beforeEach(() => {
    _resetRateLimitForTests()
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example/'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.restoreAllMocks()
  })

  it('routes the request to the Upstash pipeline endpoint with the bearer token', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60_000 }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const r = await rateLimit('alice', 5, 60_000)
    expect(r.allowed).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://upstash.example/pipeline')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
    const body = JSON.parse(init?.body as string) as Array<Array<string | number>>
    expect(body[0]).toEqual(['INCR', 'rl:alice'])
    expect(body[1][0]).toBe('EXPIRE')
  })

  it('rejects when the INCR result exceeds the limit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([{ result: 6 }, { result: 0 }, { result: 5_000 }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const r = await rateLimit('alice', 5, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('falls back to in-memory when Upstash returns non-2xx', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))
    // Suppress the expected warn so the test output stays clean.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const r = await rateLimit('alice', 5, 60_000)
    expect(r.allowed).toBe(true) // in-memory grants 1/5
  })
})
