import { describe, expect, it } from 'vitest'
import {
  SERVICE_CATEGORY_TO_DEFAULT_NAME,
  matchServiceTypeForCategory,
} from './category-mapping'

describe('SERVICE_CATEGORY_TO_DEFAULT_NAME', () => {
  it('maps every non-autre category to an onboarding service name', () => {
    expect(SERVICE_CATEGORY_TO_DEFAULT_NAME.bureaux_recurrent).toBe('Nettoyage de bureaux')
    expect(SERVICE_CATEGORY_TO_DEFAULT_NAME.vitres).toBe('Nettoyage de vitres')
    expect(SERVICE_CATEGORY_TO_DEFAULT_NAME.autre).toBeNull()
  })
})

describe('matchServiceTypeForCategory', () => {
  const services = [
    { id: 'sv-1', name: 'Nettoyage de bureaux' },
    { id: 'sv-2', name: 'NETTOYAGE DE VITRES' }, // case insensitive
    { id: 'sv-3', name: 'Nettoyage de terrasse  ' }, // trailing space
    { id: 'sv-4', name: 'Maintenance custom' }, // not in mapping
  ]

  it('matches by canonical name (case insensitive)', () => {
    expect(matchServiceTypeForCategory('bureaux_recurrent', services)).toBe('sv-1')
    expect(matchServiceTypeForCategory('vitres', services)).toBe('sv-2')
  })

  it('handles whitespace and accents', () => {
    expect(matchServiceTypeForCategory('terrasse', services)).toBe('sv-3')
  })

  it('returns null for autre', () => {
    expect(matchServiceTypeForCategory('autre', services)).toBeNull()
  })

  it('returns null when no service matches', () => {
    expect(matchServiceTypeForCategory('moquette', services)).toBeNull()
  })

  it('returns null on empty services array', () => {
    expect(matchServiceTypeForCategory('bureaux_recurrent', [])).toBeNull()
  })
})
