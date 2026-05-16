import { createClient } from '@/lib/supabase/client'
import type {
  Agent, Client, Site, Lead, Opportunity, Mission,
  OperationalItem, Sop, TimeEntry, ServiceType, Company,
} from '@/types'

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getUserCompanyId(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  // Try users table first
  const { data } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (data?.company_id) return data.company_id as string

  // Fallback: auth metadata set during signup
  const metaId = user.user_metadata?.company_id as string | undefined
  if (metaId) return metaId

  throw new Error('No company_id found — check users table row exists')
}

// Strip join fields before sending to Supabase
function toAgentRow(a: Partial<Agent>) {
  return {
    id: a.id, company_id: a.company_id, first_name: a.first_name,
    last_name: a.last_name, phone: a.phone, email: a.email,
    specialty: a.specialty, skills: a.skills,
    business_registration_number: a.business_registration_number,
    contract_type: a.contract_type, weekly_availability_hours: a.weekly_availability_hours,
    weekly_availability: a.weekly_availability, zone: a.zone, status: a.status,
    hourly_cost: a.hourly_cost, notes: a.notes,
    created_at: a.created_at, updated_at: a.updated_at,
  }
}

function toClientRow(c: Partial<Client>) {
  return {
    id: c.id, company_id: c.company_id, name: c.name,
    contact_name: c.contact_name, email: c.email, phone: c.phone,
    billing_address: c.billing_address, city: c.city,
    client_type: c.client_type, status: c.status, notes: c.notes,
    created_from_opportunity_id: c.created_from_opportunity_id,
    created_at: c.created_at, updated_at: c.updated_at,
  }
}

function toSiteRow(s: Partial<Site>) {
  return {
    id: s.id, company_id: s.company_id, client_id: s.client_id, name: s.name,
    address: s.address, city: s.city, surface_area: s.surface_area,
    access_code: s.access_code, access_instructions: s.access_instructions,
    service_type: s.service_type, frequency: s.frequency, sop_id: s.sop_id,
    notes: s.notes, created_from_opportunity_id: s.created_from_opportunity_id,
    created_at: s.created_at, updated_at: s.updated_at,
  }
}

function toLeadRow(l: Partial<Lead>) {
  return {
    id: l.id, company_id: l.company_id, company_name: l.company_name,
    sector: l.sector, city: l.city, email: l.email, phone: l.phone,
    website: l.website, source: l.source, ai_score: l.ai_score,
    probable_need: l.probable_need, status: l.status, notes: l.notes,
    converted_opportunity_id: l.converted_opportunity_id,
    created_at: l.created_at, updated_at: l.updated_at,
  }
}

function toOpportunityRow(o: Partial<Opportunity>) {
  return {
    id: o.id, company_id: o.company_id, lead_id: o.lead_id,
    client_id: o.client_id, site_id: o.site_id, title: o.title,
    prospect_name: o.prospect_name, contact_name: o.contact_name,
    email: o.email, phone: o.phone, city: o.city,
    site_address: o.site_address, client_type: o.client_type,
    service_type: o.service_type, estimated_amount: o.estimated_amount,
    stage: o.stage, next_action_date: o.next_action_date, notes: o.notes,
    status: o.status, converted_to_client: o.converted_to_client,
    converted_at: o.converted_at,
    created_at: o.created_at, updated_at: o.updated_at,
  }
}

function toMissionRow(m: Partial<Mission>) {
  return {
    id: m.id, company_id: m.company_id, client_id: m.client_id,
    site_id: m.site_id, operational_item_id: m.operational_item_id,
    service_type: m.service_type, sop_id: m.sop_id, status: m.status,
    scheduled_date: m.scheduled_date, start_time: m.start_time,
    planned_hours: m.planned_hours, notes: m.notes, priority: m.priority,
    created_at: m.created_at, updated_at: m.updated_at,
  }
}

function toOperationalItemRow(i: Partial<OperationalItem>) {
  return {
    id: i.id, company_id: i.company_id, client_id: i.client_id,
    site_id: i.site_id, opportunity_id: i.opportunity_id, source: i.source,
    title: i.title, status: i.status, priority: i.priority, notes: i.notes,
    converted_to_mission: i.converted_to_mission, mission_id: i.mission_id,
    created_at: i.created_at, updated_at: i.updated_at,
  }
}

function toSopRow(s: Partial<Sop>) {
  return {
    id: s.id, company_id: s.company_id, title: s.title,
    service_type: s.service_type,
    estimated_duration_minutes: s.estimated_duration_minutes,
    required_skills: s.required_skills, required_materials: s.required_materials,
    required_products: s.required_products, checklist_items: s.checklist_items,
    safety_instructions: s.safety_instructions, notes: s.notes,
    created_at: s.created_at, updated_at: s.updated_at,
  }
}

function toTimeEntryRow(t: Partial<TimeEntry>) {
  return {
    id: t.id, company_id: t.company_id, mission_id: t.mission_id,
    agent_id: t.agent_id, client_id: t.client_id, site_id: t.site_id,
    date: t.date, planned_hours: t.planned_hours,
    validated_hours: t.validated_hours, hourly_cost: t.hourly_cost,
    total_cost: t.total_cost, status: t.status, validated_at: t.validated_at,
    created_at: t.created_at, updated_at: t.updated_at,
  }
}

function toServiceTypeRow(s: Partial<ServiceType>) {
  return {
    id: s.id, company_id: s.company_id, name: s.name,
    estimated_duration_minutes: s.estimated_duration_minutes,
    indicative_price: s.indicative_price, default_sop_id: s.default_sop_id,
    created_at: s.created_at, updated_at: s.updated_at,
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────

export async function fetchAgents(): Promise<Agent[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('agents').select('*').order('created_at')
  if (error) { console.error('fetchAgents', error); return [] }
  return (data ?? []) as Agent[]
}

export async function fetchClients(): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('clients').select('*').order('created_at')
  if (error) { console.error('fetchClients', error); return [] }
  return (data ?? []) as Client[]
}

export async function fetchSites(): Promise<Site[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('sites').select('*').order('created_at')
  if (error) { console.error('fetchSites', error); return [] }
  return (data ?? []) as Site[]
}

export async function fetchLeads(): Promise<Lead[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('leads').select('*').order('created_at')
  if (error) { console.error('fetchLeads', error); return [] }
  return (data ?? []) as Lead[]
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('opportunities').select('*').order('created_at')
  if (error) { console.error('fetchOpportunities', error); return [] }
  return (data ?? []) as Opportunity[]
}

export async function fetchMissions(): Promise<Mission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('missions')
    .select('*, mission_agents(agent_id, agents(*))')
    .order('scheduled_date')
  if (error) { console.error('fetchMissions', error); return [] }

  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>
    const missionAgents = (r.mission_agents as { agent_id: string; agents: unknown }[] | null) ?? []
    const agents = missionAgents.map(ma => ma.agents).filter(Boolean) as Agent[]
    const { mission_agents: _ma, ...rest } = r
    void _ma
    return { ...rest, agents } as Mission
  })
}

export async function fetchOperationalItems(): Promise<OperationalItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('operational_items').select('*').order('created_at')
  if (error) { console.error('fetchOperationalItems', error); return [] }
  return (data ?? []) as OperationalItem[]
}

export async function fetchSops(): Promise<Sop[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('sops').select('*').order('created_at')
  if (error) { console.error('fetchSops', error); return [] }
  return (data ?? []) as Sop[]
}

export async function fetchTimeEntries(): Promise<TimeEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('time_entries').select('*').order('created_at')
  if (error) { console.error('fetchTimeEntries', error); return [] }
  return (data ?? []) as TimeEntry[]
}

export async function fetchServiceTypes(): Promise<ServiceType[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('service_types').select('*').order('created_at')
  if (error) { console.error('fetchServiceTypes', error); return [] }
  return (data ?? []) as ServiceType[]
}

export async function fetchCompany(): Promise<Company | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id ?? user.user_metadata?.company_id
  if (!companyId) return null

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (error) { console.error('fetchCompany', error); return null }
  return data as Company
}

// ─── AGENTS ──────────────────────────────────────────────────────────────────

export async function createAgent(agent: Agent): Promise<Agent> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toAgentRow(agent), company_id: companyId }
  const { data, error } = await supabase.from('agents').insert(row).select().single()
  if (error) throw error
  return data as Agent
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
  const supabase = createClient()
  const row = { ...toAgentRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('agents').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Agent
}

export async function deleteAgent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('agents').delete().eq('id', id)
  if (error) throw error
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function createClient_(client: Client): Promise<Client> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toClientRow(client), company_id: companyId }
  const { data, error } = await supabase.from('clients').insert(row).select().single()
  if (error) throw error
  return data as Client
}

export async function updateClient_(id: string, data: Partial<Client>): Promise<Client> {
  const supabase = createClient()
  const row = { ...toClientRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('clients').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Client
}

export async function deleteClient_(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── SITES ───────────────────────────────────────────────────────────────────

export async function createSite(site: Site): Promise<Site> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toSiteRow(site), company_id: companyId }
  const { data, error } = await supabase.from('sites').insert(row).select().single()
  if (error) throw error
  return data as Site
}

export async function updateSite(id: string, data: Partial<Site>): Promise<Site> {
  const supabase = createClient()
  const row = { ...toSiteRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('sites').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Site
}

export async function deleteSite(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw error
}

// ─── LEADS ───────────────────────────────────────────────────────────────────

export async function createLead(lead: Lead): Promise<Lead> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toLeadRow(lead), company_id: companyId }
  const { data, error } = await supabase.from('leads').insert(row).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  const supabase = createClient()
  const row = { ...toLeadRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('leads').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────

export async function createOpportunity(opp: Opportunity): Promise<Opportunity> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toOpportunityRow(opp), company_id: companyId }
  const { data, error } = await supabase.from('opportunities').insert(row).select().single()
  if (error) throw error
  return data as Opportunity
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
  const supabase = createClient()
  const row = { ...toOpportunityRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('opportunities').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Opportunity
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw error
}

export async function winOpportunity(id: string): Promise<{
  client: Client; site: Site; operationalItem: OperationalItem
}> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const now = new Date().toISOString()

  const { data: opp, error: oppError } = await supabase
    .from('opportunities').select('*').eq('id', id).single()
  if (oppError || !opp) throw oppError ?? new Error('Opportunity not found')
  const o = opp as Opportunity

  await supabase.from('opportunities').update({
    stage: 'gagnee', converted_to_client: true, converted_at: now, updated_at: now,
  }).eq('id', id)

  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_id: companyId, name: o.prospect_name, contact_name: o.contact_name,
      email: o.email, phone: o.phone, billing_address: o.site_address, city: o.city,
      client_type: o.client_type, status: 'actif', notes: o.notes,
      created_from_opportunity_id: o.id, created_at: now, updated_at: now,
    })
    .select().single()
  if (clientError || !clientData) throw clientError ?? new Error('Failed to create client')
  const newClient = clientData as Client

  const { data: siteData, error: siteError } = await supabase
    .from('sites')
    .insert({
      company_id: companyId, client_id: newClient.id,
      name: `Site ${o.prospect_name}`, address: o.site_address, city: o.city,
      service_type: o.service_type, created_from_opportunity_id: o.id,
      created_at: now, updated_at: now,
    })
    .select().single()
  if (siteError || !siteData) throw siteError ?? new Error('Failed to create site')
  const newSite = siteData as Site

  const { data: itemData, error: itemError } = await supabase
    .from('operational_items')
    .insert({
      company_id: companyId, client_id: newClient.id, site_id: newSite.id,
      opportunity_id: o.id, source: 'pipeline',
      title: `${o.prospect_name} — à organiser`,
      status: 'a_organiser', priority: 'normal',
      converted_to_mission: false, created_at: now, updated_at: now,
    })
    .select().single()
  if (itemError || !itemData) throw itemError ?? new Error('Failed to create operational item')

  return { client: newClient, site: newSite, operationalItem: itemData as OperationalItem }
}

// ─── MISSIONS ─────────────────────────────────────────────────────────────────

export async function createMission(mission: Mission): Promise<Mission> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const agents = mission.agents ?? []
  const row = { ...toMissionRow(mission), company_id: companyId }
  const { data, error } = await supabase.from('missions').insert(row).select().single()
  if (error) throw error
  const created = data as Mission

  if (agents.length > 0) {
    await supabase.from('mission_agents').insert(
      agents.map(a => ({ mission_id: created.id, agent_id: a.id, assigned_at: new Date().toISOString() }))
    )
  }
  return { ...created, agents }
}

export async function updateMission(id: string, data: Partial<Mission>): Promise<Mission> {
  const supabase = createClient()
  const agents = data.agents
  const row = { ...toMissionRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('missions').update(row).eq('id', id).select().single()
  if (error) throw error

  if (agents !== undefined) {
    await supabase.from('mission_agents').delete().eq('mission_id', id)
    if (agents.length > 0) {
      await supabase.from('mission_agents').insert(
        agents.map(a => ({ mission_id: id, agent_id: a.id, assigned_at: new Date().toISOString() }))
      )
    }
  }
  return { ...updated, agents } as Mission
}

export async function deleteMission(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('mission_agents').delete().eq('mission_id', id)
  const { error } = await supabase.from('missions').delete().eq('id', id)
  if (error) throw error
}

// ─── OPERATIONAL ITEMS ────────────────────────────────────────────────────────

export async function createOperationalItem(item: OperationalItem): Promise<OperationalItem> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toOperationalItemRow(item), company_id: companyId }
  const { data, error } = await supabase.from('operational_items').insert(row).select().single()
  if (error) throw error
  return data as OperationalItem
}

export async function updateOperationalItem(id: string, data: Partial<OperationalItem>): Promise<OperationalItem> {
  const supabase = createClient()
  const row = { ...toOperationalItemRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('operational_items').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as OperationalItem
}

export async function deleteOperationalItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('operational_items').delete().eq('id', id)
  if (error) throw error
}

// ─── SOPS ─────────────────────────────────────────────────────────────────────

export async function createSop(sop: Sop): Promise<Sop> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toSopRow(sop), company_id: companyId }
  const { data, error } = await supabase.from('sops').insert(row).select().single()
  if (error) throw error
  return data as Sop
}

export async function updateSop(id: string, data: Partial<Sop>): Promise<Sop> {
  const supabase = createClient()
  const row = { ...toSopRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('sops').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as Sop
}

export async function deleteSop(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sops').delete().eq('id', id)
  if (error) throw error
}

// ─── TIME ENTRIES ─────────────────────────────────────────────────────────────

export async function createTimeEntry(entry: TimeEntry): Promise<TimeEntry> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toTimeEntryRow(entry), company_id: companyId }
  const { data, error } = await supabase.from('time_entries').insert(row).select().single()
  if (error) throw error
  return data as TimeEntry
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry> {
  const supabase = createClient()
  const row = { ...toTimeEntryRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('time_entries').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as TimeEntry
}

// ─── SERVICE TYPES ────────────────────────────────────────────────────────────

export async function createServiceType(st: ServiceType): Promise<ServiceType> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const row = { ...toServiceTypeRow(st), company_id: companyId }
  const { data, error } = await supabase.from('service_types').insert(row).select().single()
  if (error) throw error
  return data as ServiceType
}

export async function updateServiceType(id: string, data: Partial<ServiceType>): Promise<ServiceType> {
  const supabase = createClient()
  const row = { ...toServiceTypeRow(data), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('service_types').update(row).eq('id', id).select().single()
  if (error) throw error
  return updated as ServiceType
}

export async function deleteServiceType(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('service_types').delete().eq('id', id)
  if (error) throw error
}

// ─── COMPANY ──────────────────────────────────────────────────────────────────

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('companies')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated as Company
}
