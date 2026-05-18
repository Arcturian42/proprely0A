import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, _resetRateLimitForTests } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    _resetRateLimitForTests()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit('alice', 5, 60_000)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(5 - i - 1)
    }
  })

  it('rejects the (limit+1)th request inside the window', () => {
    for (let i = 0; i < 5; i++) rateLimit('alice', 5, 60_000)
    const r = rateLimit('alice', 5, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    for (let i = 0; i < 5; i++) rateLimit('alice', 5, 60_000)
    expect(rateLimit('alice', 5, 60_000).allowed).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(rateLimit('alice', 5, 60_000).allowed).toBe(true)
  })

  it('scopes per key — alice and bob have independent buckets', () => {
    for (let i = 0; i < 5; i++) rateLimit('alice', 5, 60_000)
    expect(rateLimit('alice', 5, 60_000).allowed).toBe(false)
    expect(rateLimit('bob', 5, 60_000).allowed).toBe(true)
  })
})
