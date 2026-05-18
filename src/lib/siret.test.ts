import { describe, expect, it } from 'vitest'
import { isValidSiret, isValidSiren } from './siret'

describe('isValidSiret', () => {
  it('accepts valid SIRETs', () => {
    // Real valid SIRETs (public registry)
    expect(isValidSiret('73282932000074')).toBe(true) // Apple France HQ
    expect(isValidSiret('732 829 320 00074')).toBe(true) // with spaces
  })

  it('rejects SIRETs with wrong checksum', () => {
    expect(isValidSiret('73282932000075')).toBe(false) // off by 1
    expect(isValidSiret('00000000000001')).toBe(false)
  })

  it('rejects non-14-digit strings', () => {
    expect(isValidSiret('')).toBe(false)
    expect(isValidSiret('1234')).toBe(false)
    expect(isValidSiret('732829320000749')).toBe(false) // 15 digits
    expect(isValidSiret('732829320000A1')).toBe(false) // letter inside
  })

  it('handles La Poste special case (digits sum mod 5)', () => {
    // La Poste SIRET starts with 356000000, validity = sum % 5 == 0
    // Build one: 356000000 + 5 digits where total sum is divisible by 5
    // 3+5+6+0+0+0+0+0+0 = 14. Need 5 more digits summing to 1, 6, 11, 16, 21...
    // Use 00001: total = 14+1 = 15 ✓
    expect(isValidSiret('35600000000001')).toBe(true)
    // 14+2 = 16, not divisible by 5
    expect(isValidSiret('35600000000002')).toBe(false)
  })
})

describe('isValidSiren', () => {
  it('accepts valid SIRENs', () => {
    expect(isValidSiren('732829320')).toBe(true) // Apple France
  })

  it('rejects invalid SIRENs', () => {
    expect(isValidSiren('732829321')).toBe(false)
    expect(isValidSiren('123')).toBe(false)
    expect(isValidSiren('732 829 320')).toBe(true) // with spaces
  })
})
