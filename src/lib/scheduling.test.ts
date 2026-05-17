import { describe, it, expect } from 'vitest'
import { parseTimeToHours, missionToSlot, hasAgentConflict } from './scheduling'
import type { Mission } from '@/types'

const baseMission: Mission = {
  id: 'm1',
  company_id: 'company-1',
  client_id: 'c1',
  site_id: 's1',
  operational_item_id: null,
  service_type: null,
  sop_id: null,
  status: 'prevue',
  scheduled_date: '2026-05-20',
  start_time: '08:00',
  planned_hours: 2,
  notes: null,
  priority: 'normale',
  created_at: '2026-05-17T00:00:00Z',
  updated_at: '2026-05-17T00:00:00Z',
  agents: [{ id: 'agent-1' } as Mission['agents'] extends (infer U)[] | undefined ? U : never],
}

describe('parseTimeToHours', () => {
  it('renvoie le fallback pour null/undefined/chaîne vide', () => {
    expect(parseTimeToHours(null)).toBe(8)
    expect(parseTimeToHours(undefined)).toBe(8)
    expect(parseTimeToHours('')).toBe(8)
    expect(parseTimeToHours(null, 10)).toBe(10)
  })

  it('parse correctement HH:mm', () => {
    expect(parseTimeToHours('08:00')).toBe(8)
    expect(parseTimeToHours('08:30')).toBe(8.5)
    expect(parseTimeToHours('14:45')).toBeCloseTo(14.75)
  })

  it('gère un format dégradé', () => {
    expect(parseTimeToHours('09')).toBe(9)
    expect(parseTimeToHours('xx:30')).toBe(8) // fallback car heure invalide
  })
})

describe('missionToSlot', () => {
  it('calcule le slot à partir du start_time et de la durée', () => {
    expect(missionToSlot({ start_time: '08:30', planned_hours: 2.5 })).toEqual({ start: 8.5, end: 11 })
  })

  it('utilise le fallback 8h si start_time est null', () => {
    expect(missionToSlot({ start_time: null, planned_hours: 3 })).toEqual({ start: 8, end: 11 })
  })
})

describe('hasAgentConflict', () => {
  const missions: Mission[] = [
    { ...baseMission, id: 'm1', scheduled_date: '2026-05-20', start_time: '08:00', planned_hours: 2 },
    { ...baseMission, id: 'm2', scheduled_date: '2026-05-20', start_time: '14:00', planned_hours: 1 },
  ]

  it('détecte un chevauchement exact', () => {
    expect(hasAgentConflict('agent-1', '2026-05-20', 8, 2, missions)).toBe(true)
  })

  it('détecte un chevauchement partiel via les minutes', () => {
    // Nouvelle mission 08:30 → 09:30 : conflit avec 08:00–10:00
    expect(hasAgentConflict('agent-1', '2026-05-20', 8.5, 1, missions)).toBe(true)
  })

  it('ne déclenche pas si fin = début de l\'autre slot (créneau accolé)', () => {
    // Nouvelle mission 10:00 → 11:00 : juste après 08:00–10:00
    expect(hasAgentConflict('agent-1', '2026-05-20', 10, 1, missions)).toBe(false)
  })

  it('ne déclenche pas pour un autre agent', () => {
    expect(hasAgentConflict('agent-2', '2026-05-20', 8, 2, missions)).toBe(false)
  })

  it('ne déclenche pas pour une autre date', () => {
    expect(hasAgentConflict('agent-1', '2026-05-21', 8, 2, missions)).toBe(false)
  })

  it('peut exclure une mission (cas édition)', () => {
    expect(hasAgentConflict('agent-1', '2026-05-20', 8, 2, missions, 'm1')).toBe(false)
  })
})
