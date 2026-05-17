import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './store'
import type { Client, Site, Mission, TimeEntry, Opportunity, OperationalItem, Lead, Agent } from '@/types'

const agent: Agent = {
  id: 'agent-1', company_id: 'company-1', first_name: 'A', last_name: 'B',
  phone: null, email: null, specialty: null, skills: [],
  business_registration_number: null, contract_type: 'cdi',
  weekly_availability_hours: 35, weekly_availability: {}, zone: null,
  status: 'disponible', hourly_cost: 20, notes: null,
  created_at: '', updated_at: '',
}
const client: Client = {
  id: 'c1', company_id: 'company-1', name: 'Client A',
  contact_name: null, email: null, phone: null, billing_address: null,
  city: null, client_type: null, status: 'actif', notes: null,
  created_from_opportunity_id: null, created_at: '', updated_at: '',
}
const site: Site = {
  id: 's1', company_id: 'company-1', client_id: 'c1', name: 'Site A',
  address: null, city: null, surface_area: null, access_code: null,
  access_instructions: null, service_type: null, frequency: null,
  sop_id: null, notes: null, created_from_opportunity_id: null,
  created_at: '', updated_at: '',
}
const mission: Mission = {
  id: 'm1', company_id: 'company-1', client_id: 'c1', site_id: 's1',
  operational_item_id: null, service_type: null, sop_id: null,
  status: 'prevue', scheduled_date: '2026-05-20', start_time: '08:00',
  planned_hours: 2, notes: null, priority: 'normale',
  created_at: '', updated_at: '',
}
const timeEntry: TimeEntry = {
  id: 'te1', company_id: 'company-1', mission_id: 'm1', agent_id: 'agent-1',
  client_id: 'c1', site_id: 's1', date: '2026-05-20',
  planned_hours: 2, validated_hours: null, hourly_cost: 20, total_cost: null,
  status: 'prevue', validated_at: null, created_at: '', updated_at: '',
}
const opportunity: Opportunity = {
  id: 'o1', company_id: 'company-1', lead_id: 'l1', client_id: 'c1', site_id: 's1',
  title: 'Opp A', prospect_name: 'P', contact_name: null, email: null,
  phone: null, city: null, site_address: null, client_type: null,
  service_type: null, estimated_amount: 1000, stage: 'gagnee',
  next_action_date: null, notes: null, status: 'active',
  converted_to_client: true, converted_at: null,
  created_at: '', updated_at: '',
}
const opItem: OperationalItem = {
  id: 'oi1', company_id: 'company-1', client_id: 'c1', site_id: 's1',
  opportunity_id: 'o1', source: 'pipeline', title: 'Item',
  status: 'a_organiser', priority: 'normal', notes: null,
  converted_to_mission: false, mission_id: null,
  created_at: '', updated_at: '',
}
const lead: Lead = {
  id: 'l1', company_id: 'company-1', company_name: 'P', sector: null,
  city: null, email: null, phone: null, website: null, source: null,
  ai_score: null, probable_need: null, status: 'converti', notes: null,
  converted_opportunity_id: 'o1', created_at: '', updated_at: '',
}

function seedStore() {
  useAppStore.setState({
    agents: [agent],
    clients: [client],
    leads: [lead],
    missions: [mission],
    opportunities: [opportunity],
    operationalItems: [opItem],
    sites: [site],
    sops: [],
    timeEntries: [timeEntry],
  })
}

describe('store.deleteClient — cascade', () => {
  beforeEach(seedStore)

  it('supprime le client et tous les sites associés', () => {
    useAppStore.getState().deleteClient('c1')
    const s = useAppStore.getState()
    expect(s.clients).toHaveLength(0)
    expect(s.sites).toHaveLength(0)
  })

  it('supprime les missions et timeEntries liées', () => {
    useAppStore.getState().deleteClient('c1')
    const s = useAppStore.getState()
    expect(s.missions).toHaveLength(0)
    expect(s.timeEntries).toHaveLength(0)
  })

  it('supprime les operationalItems liés au client ou au site', () => {
    useAppStore.getState().deleteClient('c1')
    expect(useAppStore.getState().operationalItems).toHaveLength(0)
  })

  it('détache les opportunités du client (client_id et site_id null)', () => {
    useAppStore.getState().deleteClient('c1')
    const o = useAppStore.getState().opportunities[0]
    expect(o.client_id).toBeNull()
    expect(o.site_id).toBeNull()
  })

  it("remet le lead source en statut 'qualifie' et déréférence l'opportunité", () => {
    useAppStore.getState().deleteClient('c1')
    const l = useAppStore.getState().leads[0]
    expect(l.status).toBe('qualifie')
    expect(l.converted_opportunity_id).toBeNull()
  })
})

describe('store.updateMissionStatus — validation des heures', () => {
  beforeEach(seedStore)

  it("borne les heures négatives à 0", () => {
    useAppStore.getState().updateMissionStatus('m1', 'terminee', -5)
    const te = useAppStore.getState().timeEntries[0]
    expect(te.validated_hours).toBe(0)
  })

  it('borne les heures > 24 à 24', () => {
    useAppStore.getState().updateMissionStatus('m1', 'terminee', 999)
    const te = useAppStore.getState().timeEntries[0]
    expect(te.validated_hours).toBe(24)
  })

  it('calcule total_cost = validated_hours × hourly_cost', () => {
    useAppStore.getState().updateMissionStatus('m1', 'terminee', 3)
    const te = useAppStore.getState().timeEntries[0]
    expect(te.total_cost).toBe(60) // 3 × 20
    expect(te.status).toBe('validee')
  })

  it('ne touche pas aux timeEntries si validatedHours est omis', () => {
    useAppStore.getState().updateMissionStatus('m1', 'en_cours')
    const te = useAppStore.getState().timeEntries[0]
    expect(te.validated_hours).toBeNull()
    expect(te.status).toBe('prevue')
    expect(useAppStore.getState().missions[0].status).toBe('en_cours')
  })

  it('ignore les valeurs non finies (NaN)', () => {
    useAppStore.getState().updateMissionStatus('m1', 'terminee', Number.NaN)
    const te = useAppStore.getState().timeEntries[0]
    expect(te.validated_hours).toBe(0)
  })
})

describe('store.winOpportunity', () => {
  beforeEach(() => {
    useAppStore.setState({
      agents: [], clients: [], leads: [], missions: [], operationalItems: [],
      sites: [], sops: [], timeEntries: [],
      opportunities: [{
        ...opportunity,
        id: 'op-pending',
        client_id: null, site_id: null,
        stage: 'negociation', converted_to_client: false,
      }],
    })
  })

  it('crée un client, un site et un operationalItem en cascade', () => {
    useAppStore.getState().winOpportunity('op-pending')
    const s = useAppStore.getState()
    expect(s.clients).toHaveLength(1)
    expect(s.sites).toHaveLength(1)
    expect(s.operationalItems).toHaveLength(1)
    expect(s.operationalItems[0].status).toBe('a_organiser')
  })

  it("marque l'opportunité comme convertie et la lie au client créé", () => {
    useAppStore.getState().winOpportunity('op-pending')
    const o = useAppStore.getState().opportunities[0]
    expect(o.converted_to_client).toBe(true)
    expect(o.stage).toBe('gagnee')
    expect(o.client_id).toBe(useAppStore.getState().clients[0].id)
  })

  it("ne re-convertit pas une opportunité déjà gagnée", () => {
    useAppStore.getState().winOpportunity('op-pending')
    const firstClientCount = useAppStore.getState().clients.length
    useAppStore.getState().winOpportunity('op-pending')
    expect(useAppStore.getState().clients.length).toBe(firstClientCount)
  })
})
