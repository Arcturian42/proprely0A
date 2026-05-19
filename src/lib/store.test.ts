import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the Supabase client config so the store doesn't try to call server
// actions on writes. Tests are pure store logic.
vi.mock('@/lib/supabase/client-config', () => ({
  isSupabaseClient: () => false,
}))

// All server-action imports must be mocked since the store wraps mutations
// with syncToSupabase(); we don't want real network calls in tests.
vi.mock('@/app/actions/data', () => {
  const noop = vi.fn(async () => ({ ok: true }))
  return new Proxy({}, { get: () => noop })
})

import { useAppStore } from './store'
import type { Opportunity } from '@/types'

const baseOpp: Opportunity = {
  id: 'opp-1',
  company_id: 'company-test',
  lead_id: null,
  client_id: null,
  site_id: null,
  title: 'Acme cleaning contract',
  prospect_name: 'Acme SARL',
  contact_name: 'Alice',
  contact_role: null,
  email: 'alice@acme.fr',
  phone: '0102030405',
  city: 'Paris',
  postal_code: null,
  site_address: '10 rue de la Paix',
  client_type: null,
  service_type: 'bureaux_recurrent',
  estimated_amount: 12000,
  stage: 'negociation',
  next_action_date: null,
  next_action_type: null,
  next_action_note: null,
  notes: null,
  siren: null,
  siret: null,
  naf_code: null,
  legal_form: null,
  company_status: null,
  source: 'manual',
  status: 'ouvert',
  converted_to_client: false,
  converted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('useAppStore — mutations', () => {
  beforeEach(() => {
    // Reset state by re-hydrating with a minimal known snapshot.
    useAppStore.getState().hydrateCompanyData({
      agents: [], clients: [], sites: [],
      leads: [], opportunities: [baseOpp],
      missions: [], operationalItems: [], sops: [],
      timeEntries: [], serviceTypes: [], quotes: [],
      pricingSettings: { hourly_labor_cost: null },
    })
  })

  describe('winOpportunity', () => {
    it('creates a client, a site and an operational item from the opportunity', () => {
      useAppStore.getState().winOpportunity('opp-1')
      const state = useAppStore.getState()

      expect(state.clients.length).toBe(1)
      expect(state.clients[0].name).toBe('Acme SARL')
      expect(state.sites.length).toBe(1)
      expect(state.sites[0].client_id).toBe(state.clients[0].id)
      expect(state.operationalItems.length).toBe(1)
      expect(state.operationalItems[0].source).toBe('pipeline')
      expect(state.operationalItems[0].status).toBe('a_organiser')
    })

    it('flips the opportunity stage to gagne and stamps converted_at', () => {
      useAppStore.getState().winOpportunity('opp-1')
      const opp = useAppStore.getState().opportunities[0]
      expect(opp.stage).toBe('gagne')
      expect(opp.converted_to_client).toBe(true)
      expect(opp.converted_at).toBeTruthy()
      expect(opp.client_id).toBeTruthy()
      expect(opp.site_id).toBeTruthy()
    })

    it('is idempotent — calling twice doesn\'t create duplicates', () => {
      useAppStore.getState().winOpportunity('opp-1')
      useAppStore.getState().winOpportunity('opp-1')
      const state = useAppStore.getState()
      expect(state.clients.length).toBe(1)
      expect(state.sites.length).toBe(1)
      expect(state.operationalItems.length).toBe(1)
    })

    it('does nothing for an unknown opportunity id', () => {
      useAppStore.getState().winOpportunity('nope')
      const state = useAppStore.getState()
      expect(state.clients.length).toBe(0)
      expect(state.sites.length).toBe(0)
    })
  })

  describe('signOpportunityContract', () => {
    it('creates a client, site and DRAFT mission, and returns the mission id', () => {
      const missionId = useAppStore.getState().signOpportunityContract('opp-1')
      expect(missionId).toBeTruthy()
      const state = useAppStore.getState()
      expect(state.clients.length).toBe(1)
      expect(state.sites.length).toBe(1)
      expect(state.missions.length).toBe(1)
      expect(state.missions[0].id).toBe(missionId)
      expect(state.missions[0].status).toBe('prevue')
      expect(state.missions[0].operational_status).toBe('a_organiser')
    })

    it('reuses existing client/site when opportunity is already converted', () => {
      // First, win the opp (creates client+site).
      useAppStore.getState().winOpportunity('opp-1')
      const beforeClients = useAppStore.getState().clients.length
      const beforeSites = useAppStore.getState().sites.length

      // Then sign — should reuse, not duplicate.
      useAppStore.getState().signOpportunityContract('opp-1')
      const state = useAppStore.getState()
      expect(state.clients.length).toBe(beforeClients)
      expect(state.sites.length).toBe(beforeSites)
      expect(state.missions.length).toBe(1)
    })

    it('returns null for an unknown opportunity id', () => {
      const result = useAppStore.getState().signOpportunityContract('nope')
      expect(result).toBeNull()
    })
  })

  describe('updateMissionStatus', () => {
    it('clamps validated hours to [0, 24]', () => {
      const missionId = useAppStore.getState().signOpportunityContract('opp-1')!
      // Add a time entry so the mutation has something to validate.
      useAppStore.getState().addTimeEntry({
        id: 'te-1',
        company_id: 'company-test',
        mission_id: missionId,
        agent_id: 'a-1',
        client_id: 'c-1',
        site_id: 's-1',
        date: '2026-01-01',
        planned_hours: 3,
        validated_hours: null,
        hourly_cost: 20,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: '', updated_at: '',
      })
      useAppStore.getState().updateMissionStatus(missionId, 'terminee', 99)
      const te = useAppStore.getState().timeEntries.find(t => t.mission_id === missionId)
      expect(te?.validated_hours).toBe(24)
    })

    it('rejects NaN gracefully (defaults to 0)', () => {
      const missionId = useAppStore.getState().signOpportunityContract('opp-1')!
      useAppStore.getState().addTimeEntry({
        id: 'te-2',
        company_id: 'company-test',
        mission_id: missionId,
        agent_id: 'a-1',
        client_id: 'c-1',
        site_id: 's-1',
        date: '2026-01-01',
        planned_hours: 3,
        validated_hours: null,
        hourly_cost: 20,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: '', updated_at: '',
      })
      useAppStore.getState().updateMissionStatus(missionId, 'terminee', NaN)
      const te = useAppStore.getState().timeEntries.find(t => t.mission_id === missionId)
      expect(te?.validated_hours).toBe(0)
    })

    // P2.3 / BUG-MAJ-05 — total_cost must be (validated_hours * hourly_cost)
    // with a clean fallback chain (time-entry rate → company default → 0)
    // instead of silently preserving the prior total_cost.
    it('computes total_cost from the time-entry hourly_cost when present', () => {
      const missionId = useAppStore.getState().signOpportunityContract('opp-1')!
      useAppStore.getState().addTimeEntry({
        id: 'te-3',
        company_id: 'company-test',
        mission_id: missionId,
        agent_id: 'a-1',
        client_id: 'c-1',
        site_id: 's-1',
        date: '2026-01-01',
        planned_hours: 3,
        validated_hours: null,
        hourly_cost: 25,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: '', updated_at: '',
      })
      useAppStore.getState().updateMissionStatus(missionId, 'terminee', 4)
      const te = useAppStore.getState().timeEntries.find(t => t.id === 'te-3')
      expect(te?.total_cost).toBe(100) // 4 × 25
    })

    it('falls back to companySettings.hourly_labor_cost when te.hourly_cost is null', () => {
      // Hydrate the store's company settings with a default rate (mirrors
      // what loadCompanyData → hydrateCompanyData does in production).
      useAppStore.getState().updateCompanySettings({ hourly_labor_cost: 22 })

      const missionId = useAppStore.getState().signOpportunityContract('opp-1')!
      useAppStore.getState().addTimeEntry({
        id: 'te-4',
        company_id: 'company-test',
        mission_id: missionId,
        agent_id: 'a-1',
        client_id: 'c-1',
        site_id: 's-1',
        date: '2026-01-01',
        planned_hours: 3,
        validated_hours: null,
        hourly_cost: null,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: '', updated_at: '',
      })
      useAppStore.getState().updateMissionStatus(missionId, 'terminee', 5)
      const te = useAppStore.getState().timeEntries.find(t => t.id === 'te-4')
      expect(te?.total_cost).toBe(110) // 5 × 22 (company default)
    })

    it('lands on 0 (rather than stale null) when neither rate is set', () => {
      useAppStore.getState().updateCompanySettings({ hourly_labor_cost: null })

      const missionId = useAppStore.getState().signOpportunityContract('opp-1')!
      useAppStore.getState().addTimeEntry({
        id: 'te-5',
        company_id: 'company-test',
        mission_id: missionId,
        agent_id: 'a-1',
        client_id: 'c-1',
        site_id: 's-1',
        date: '2026-01-01',
        planned_hours: 3,
        validated_hours: null,
        hourly_cost: null,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: '', updated_at: '',
      })
      useAppStore.getState().updateMissionStatus(missionId, 'terminee', 6)
      const te = useAppStore.getState().timeEntries.find(t => t.id === 'te-5')
      expect(te?.total_cost).toBe(0)
    })
  })

  describe('deleteClient — cascade', () => {
    it('mirrors the DB cascade locally (sites + missions wiped)', () => {
      useAppStore.getState().winOpportunity('opp-1')
      useAppStore.getState().signOpportunityContract('opp-1')
      const clientId = useAppStore.getState().clients[0].id
      useAppStore.getState().deleteClient(clientId)

      const state = useAppStore.getState()
      expect(state.clients.length).toBe(0)
      expect(state.sites.length).toBe(0)
      expect(state.missions.length).toBe(0)
      expect(state.operationalItems.length).toBe(0)
    })
  })
})
