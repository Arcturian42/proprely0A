import { describe, it, expect } from 'vitest'
import {
  AgentSchema,
  ClientSchema,
  MissionSchema,
  QuoteSchema,
  TimeEntrySchema,
  getEntitySchema,
} from './entities'

// Valid payloads — these mirror what the Zustand store sends through the
// generic upsert() path. Each test below mutates one field to verify the
// schema rejects it for the right reason.

const validAgent = {
  id: 'agent-1',
  first_name: 'Marie',
  last_name: 'Dupont',
  phone: '0612345678',
  email: 'marie@example.com',
  specialty: 'bureaux',
  skills: ['vitres', 'bureaux'],
  business_registration_number: null,
  contract_type: 'cdi' as const,
  weekly_availability_hours: 35,
  weekly_availability: { lun: true, mar: true },
  zone: 'Paris',
  status: 'disponible' as const,
  hourly_cost: 14.5,
  notes: null,
}

const validClient = {
  id: 'client-1',
  name: 'ACME Corp',
  contact_name: 'Jean',
  email: 'jean@acme.fr',
  phone: '0102030405',
  billing_address: '10 rue Lafayette',
  city: 'Paris',
  client_type: 'entreprise',
  status: 'actif',
  notes: null,
  created_from_opportunity_id: null,
}

const validMission = {
  id: 'mission-1',
  client_id: 'client-1',
  site_id: 'site-1',
  operational_item_id: null,
  service_type: 'bureaux_recurrent',
  sop_id: null,
  status: 'prevue' as const,
  scheduled_date: '2026-06-01',
  start_time: '09:00',
  planned_hours: 4,
  notes: null,
  priority: 'normale',
}

const validTimeEntry = {
  id: 'te-1',
  mission_id: 'm-1',
  agent_id: 'a-1',
  client_id: 'c-1',
  site_id: 's-1',
  date: '2026-06-01',
  planned_hours: 4,
  validated_hours: null,
  hourly_cost: null,
  total_cost: null,
  status: 'prevue' as const,
  validated_at: null,
}

const validQuote = {
  id: 'q-1',
  opportunity_id: 'o-1',
  quote_number: 'DEV-001',
  title: 'Devis test',
  service_category: 'bureaux_recurrent' as const,
  surface_m2: 100,
  status: 'brouillon' as const,
  costs: {
    labor_cost: 100, machines_cost: 0, consumables_cost: 0, transport_cost: 0,
    other_costs: 0, total_cost_ht: 100, margin_rate: 0.35, price_ht: 154,
    vat_rate: 0.20, price_ttc: 184.8,
  },
  line_items: [
    { id: 'li-1', description: 'Heures', quantity: 4, unit: 'h', unit_price: 25, total: 100 },
  ],
  site_visit_notes: null,
  extraction_data: null,
  docuseal_submission_id: null,
  docuseal_signature_url: null,
  signed_at: null,
  client_name: 'ACME',
  client_email: 'contact@acme.fr',
}

describe('entity schemas — happy path', () => {
  it.each([
    ['agent', AgentSchema, validAgent],
    ['client', ClientSchema, validClient],
    ['mission', MissionSchema, validMission],
    ['time_entry', TimeEntrySchema, validTimeEntry],
    ['quote', QuoteSchema, validQuote],
  ])('accepts a valid %s payload', (_label, schema, payload) => {
    const r = schema.safeParse(payload)
    expect(r.success).toBe(true)
  })
})

describe('agent schema rejects', () => {
  it('invalid contract_type', () => {
    const r = AgentSchema.safeParse({ ...validAgent, contract_type: 'salarie' })
    expect(r.success).toBe(false)
  })
  it('invalid status', () => {
    const r = AgentSchema.safeParse({ ...validAgent, status: 'inconnu' })
    expect(r.success).toBe(false)
  })
  it('negative hourly_cost', () => {
    const r = AgentSchema.safeParse({ ...validAgent, hourly_cost: -5 })
    expect(r.success).toBe(false)
  })
  it('weekly_availability_hours > 168', () => {
    const r = AgentSchema.safeParse({ ...validAgent, weekly_availability_hours: 200 })
    expect(r.success).toBe(false)
  })
  it('missing first_name', () => {
    const r = AgentSchema.safeParse({ ...validAgent, first_name: '' })
    expect(r.success).toBe(false)
  })
})

describe('client schema rejects', () => {
  it('invalid email', () => {
    const r = ClientSchema.safeParse({ ...validClient, email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
  it('missing name', () => {
    const r = ClientSchema.safeParse({ ...validClient, name: '' })
    expect(r.success).toBe(false)
  })
})

describe('mission schema rejects', () => {
  it('invalid status', () => {
    const r = MissionSchema.safeParse({ ...validMission, status: 'pas_un_statut' })
    expect(r.success).toBe(false)
  })
  it('planned_hours > 24', () => {
    const r = MissionSchema.safeParse({ ...validMission, planned_hours: 30 })
    expect(r.success).toBe(false)
  })
  it('negative planned_hours', () => {
    const r = MissionSchema.safeParse({ ...validMission, planned_hours: -1 })
    expect(r.success).toBe(false)
  })
})

describe('time_entry schema rejects', () => {
  it('negative planned_hours', () => {
    const r = TimeEntrySchema.safeParse({ ...validTimeEntry, planned_hours: -1 })
    expect(r.success).toBe(false)
  })
  it('invalid status', () => {
    const r = TimeEntrySchema.safeParse({ ...validTimeEntry, status: 'autre' })
    expect(r.success).toBe(false)
  })
})

describe('quote schema rejects', () => {
  it('invalid service_category', () => {
    const r = QuoteSchema.safeParse({ ...validQuote, service_category: 'piscine' })
    expect(r.success).toBe(false)
  })
  it('vat_rate > 1', () => {
    const r = QuoteSchema.safeParse({
      ...validQuote,
      costs: { ...validQuote.costs, vat_rate: 1.5 },
    })
    expect(r.success).toBe(false)
  })
  it('negative price_ht', () => {
    const r = QuoteSchema.safeParse({
      ...validQuote,
      costs: { ...validQuote.costs, price_ht: -10 },
    })
    expect(r.success).toBe(false)
  })
  it('too many line_items (501)', () => {
    const r = QuoteSchema.safeParse({
      ...validQuote,
      line_items: Array.from({ length: 501 }, (_, i) => ({
        id: `li-${i}`, description: 'x', quantity: 1, unit: 'u', unit_price: 1, total: 1,
      })),
    })
    expect(r.success).toBe(false)
  })
})

describe('dispatcher', () => {
  it('returns a schema for known tables', () => {
    expect(getEntitySchema('agents')).not.toBeNull()
    expect(getEntitySchema('clients')).not.toBeNull()
    expect(getEntitySchema('quotes')).not.toBeNull()
  })
  it('returns null for unknown tables', () => {
    expect(getEntitySchema('foo_bar')).toBeNull()
    expect(getEntitySchema('')).toBeNull()
  })
})
