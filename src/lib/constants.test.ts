import { describe, it, expect } from 'vitest'
import {
  formatServiceType,
  formatFrequency,
  SITE_SERVICE_TYPE_LABELS,
  SITE_FREQUENCY_LABELS,
} from './constants'

describe('formatServiceType (BUG-009)', () => {
  it('maps the documented enum values to human-readable French labels', () => {
    expect(formatServiceType('nettoyage_bureaux')).toBe('Nettoyage bureaux')
    expect(formatServiceType('nettoyage_medical')).toBe('Nettoyage médical')
    expect(formatServiceType('nettoyage_industriel')).toBe('Nettoyage industriel')
    expect(formatServiceType('nettoyage_residence')).toBe('Nettoyage résidence')
    expect(formatServiceType('nettoyage_parking')).toBe('Nettoyage parking')
    expect(formatServiceType('vitrerie')).toBe('Vitrerie')
  })

  it('handles null/undefined/empty as empty string (caller falls back to dash)', () => {
    expect(formatServiceType(null)).toBe('')
    expect(formatServiceType(undefined)).toBe('')
    expect(formatServiceType('')).toBe('')
  })

  it('falls back to a human-friendly transform for unknown values rather than leaking snake_case', () => {
    expect(formatServiceType('nettoyage_restauration')).toBe('Nettoyage restauration')
    expect(formatServiceType('autre_chose_de_special')).toBe('Autre chose de special')
  })

  it('keeps the constants map intact', () => {
    expect(SITE_SERVICE_TYPE_LABELS.nettoyage_bureaux).toBe('Nettoyage bureaux')
    expect(Object.keys(SITE_SERVICE_TYPE_LABELS)).toContain('vitrerie')
  })
})

describe('formatFrequency', () => {
  it('maps the documented frequencies to French labels', () => {
    expect(formatFrequency('quotidien')).toBe('Quotidien')
    expect(formatFrequency('hebdomadaire')).toBe('Hebdomadaire')
    expect(formatFrequency('bi_hebdomadaire')).toBe('Bi-hebdomadaire')
    expect(formatFrequency('mensuel')).toBe('Mensuel')
    expect(formatFrequency('ponctuel')).toBe('Ponctuel')
  })

  it('keeps the constants map intact', () => {
    expect(SITE_FREQUENCY_LABELS.quotidien).toBe('Quotidien')
  })

  it('handles null/undefined cleanly', () => {
    expect(formatFrequency(null)).toBe('')
    expect(formatFrequency(undefined)).toBe('')
  })
})
