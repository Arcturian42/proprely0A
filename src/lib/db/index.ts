import { createClient } from '@/lib/supabase/client'
import type { Agent, Client, Site, Lead, Opportunity, Mission, OperationalItem, Sop, TimeEntry, ServiceType, Company } from '@/types'

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getUserCompanyId(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (error || !data) throw new Error('Could not get company_id')
  return data.company_id as string
}

// ─── READ ─────────────────────────────────────────────────────────────────────

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
  if (!userData) return null

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', userData.company_id)
    .single()
  if (error) { console.error('fetchCompany', error); return null }
  return data as Company
}

// ─── AGENTS ──────────────────────────────────────────────────────────────────

export async function createAgent(agent: Agent): Promise<Agent> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const { data, error } = await supabase
    .from('agents')
    .insert({ ...agent, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Agent
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('agents')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Client
}

export async function updateClient_(id: string, data: Partial<Client>): Promise<Client> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('clients')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { data, error } = await supabase
    .from('sites')
    .insert({ ...site, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Site
}

export async function updateSite(id: string, data: Partial<Site>): Promise<Site> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('sites')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('leads')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { data, error } = await supabase
    .from('opportunities')
    .insert({ ...opp, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Opportunity
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('opportunities')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated as Opportunity
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw error
}

export async function winOpportunity(id: string): Promise<{ client: Client; site: Site; operationalItem: OperationalItem }> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const now = new Date().toISOString()

  // Fetch the opportunity
  const { data: opp, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()
  if (oppError || !opp) throw oppError ?? new Error('Opportunity not found')

  const typedOpp = opp as Opportunity

  // 1. Update opportunity
  await supabase
    .from('opportunities')
    .update({ stage: 'gagnee', converted_to_client: true, converted_at: now, updated_at: now })
    .eq('id', id)

  // 2. Create client
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_id: companyId,
      name: typedOpp.prospect_name,
      contact_name: typedOpp.contact_name,
      email: typedOpp.email,
      phone: typedOpp.phone,
      billing_address: typedOpp.site_address,
      city: typedOpp.city,
      client_type: typedOpp.client_type,
      status: 'actif',
      notes: typedOpp.notes,
      created_from_opportunity_id: typedOpp.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()
  if (clientError || !clientData) throw clientError ?? new Error('Failed to create client')
  const newClient = clientData as Client

  // 3. Create site
  const { data: siteData, error: siteError } = await supabase
    .from('sites')
    .insert({
      company_id: companyId,
      client_id: newClient.id,
      name: `Site ${typedOpp.prospect_name}`,
      address: typedOpp.site_address,
      city: typedOpp.city,
      service_type: typedOpp.service_type,
      surface_area: null,
      access_code: null,
      access_instructions: null,
      frequency: null,
      sop_id: null,
      notes: null,
      created_from_opportunity_id: typedOpp.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()
  if (siteError || !siteData) throw siteError ?? new Error('Failed to create site')
  const newSite = siteData as Site

  // 4. Create operational item
  const { data: itemData, error: itemError } = await supabase
    .from('operational_items')
    .insert({
      company_id: companyId,
      client_id: newClient.id,
      site_id: newSite.id,
      opportunity_id: typedOpp.id,
      source: 'pipeline',
      title: `${typedOpp.prospect_name} — à organiser`,
      status: 'a_organiser',
      priority: 'normal',
      notes: null,
      converted_to_mission: false,
      mission_id: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()
  if (itemError || !itemData) throw itemError ?? new Error('Failed to create operational item')
  const newItem = itemData as OperationalItem

  return { client: newClient, site: newSite, operationalItem: newItem }
}

// ─── MISSIONS ─────────────────────────────────────────────────────────────────

export async function createMission(mission: Mission): Promise<Mission> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const { agents, client, site, sop, ...missionData } = mission
  void agents; void client; void site; void sop

  const { data, error } = await supabase
    .from('missions')
    .insert({ ...missionData, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  const created = data as Mission

  // Insert mission_agents
  if (agents && agents.length > 0) {
    await supabase.from('mission_agents').insert(
      agents.map(a => ({
        mission_id: created.id,
        agent_id: a.id,
        assigned_at: new Date().toISOString(),
      }))
    )
  }

  return { ...created, agents: agents ?? [] }
}

export async function updateMission(id: string, data: Partial<Mission>): Promise<Mission> {
  const supabase = createClient()
  const { agents, client, site, sop, ...missionData } = data
  void client; void site; void sop

  const { data: updated, error } = await supabase
    .from('missions')
    .update({ ...missionData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Update mission_agents if provided
  if (agents !== undefined) {
    await supabase.from('mission_agents').delete().eq('mission_id', id)
    if (agents.length > 0) {
      await supabase.from('mission_agents').insert(
        agents.map(a => ({
          mission_id: id,
          agent_id: a.id,
          assigned_at: new Date().toISOString(),
        }))
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
  const { client, site, ...itemData } = item
  void client; void site
  const { data, error } = await supabase
    .from('operational_items')
    .insert({ ...itemData, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as OperationalItem
}

export async function updateOperationalItem(id: string, data: Partial<OperationalItem>): Promise<OperationalItem> {
  const supabase = createClient()
  const { client, site, ...updateData } = data
  void client; void site
  const { data: updated, error } = await supabase
    .from('operational_items')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { data, error } = await supabase
    .from('sops')
    .insert({ ...sop, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as Sop
}

export async function updateSop(id: string, data: Partial<Sop>): Promise<Sop> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('sops')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
  const { agent, mission, client, site, ...entryData } = entry
  void agent; void mission; void client; void site
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ ...entryData, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as TimeEntry
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry> {
  const supabase = createClient()
  const { agent, mission, client, site, ...updateData } = data
  void agent; void mission; void client; void site
  const { data: updated, error } = await supabase
    .from('time_entries')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated as TimeEntry
}

// ─── SERVICE TYPES ────────────────────────────────────────────────────────────

export async function createServiceType(serviceType: ServiceType): Promise<ServiceType> {
  const supabase = createClient()
  const companyId = await getUserCompanyId()
  const { data, error } = await supabase
    .from('service_types')
    .insert({ ...serviceType, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data as ServiceType
}

export async function updateServiceType(id: string, data: Partial<ServiceType>): Promise<ServiceType> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from('service_types')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
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
