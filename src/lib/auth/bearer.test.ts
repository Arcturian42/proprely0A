import { describe, expect, it } from 'vitest'
import { verifyBearer } from './bearer'

describe('verifyBearer', () => {
  const secret = 'super-secret-token-12345'

  it('returns true on matching header', () => {
    expect(verifyBearer(`Bearer ${secret}`, secret)).toBe(true)
  })

  it('returns false on mismatched secret', () => {
    expect(verifyBearer(`Bearer wrong-secret`, secret)).toBe(false)
  })

  it('returns false when header is missing', () => {
    expect(verifyBearer(null, secret)).toBe(false)
  })

  it('returns false when secret is undefined (env unset)', () => {
    expect(verifyBearer(`Bearer ${secret}`, undefined)).toBe(false)
  })

  it('returns false when header lacks Bearer prefix', () => {
    expect(verifyBearer(secret, secret)).toBe(false)
  })

  it('returns false on different lengths (short-circuits before timingSafeEqual)', () => {
    expect(verifyBearer('Bearer x', secret)).toBe(false)
  })
})
