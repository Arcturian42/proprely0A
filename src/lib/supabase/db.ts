import { createClient } from './client'
import type {
  Lead, Opportunity, Client, Site, Agent, Sop, Mission,
  OperationalItem, TimeEntry, ServiceType, Company,
} from '@/types'

// ─── User Profile & Company ───────────────────────────────────────────────────

export interface UserProfile {
  id: string
  user_id: string
  company_id: string
  role: string
  created_at: string
}

export async function getOrCreateUserProfile(userId: string, companyName?: string): Promise<UserProfile & { company: Company }> {
  const supabase = createClient()

  // Check existing profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, company:companies(*)')
    .eq('user_id', userId)
    .single()

  if (profile) return profile as UserProfile & { company: Company }

  // Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName || 'Mon Entreprise' })
    .select()
    .single()

  if (companyError || !company) throw new Error('Impossible de créer la société')

  // Create profile
  const { data: newProfile, error: profileError } = await supabase
    .from('user_profiles')
    .insert({ user_id: userId, company_id: company.id, role: 'admin' })
    .select('*, company:companies(*)')
    .single()

  if (profileError || !newProfile) throw new Error('Impossible de créer le profil')

  return newProfile as UserProfile & { company: Company }
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function fetchLeads(companyId: string): Promise<Lead[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Lead[]
}

export async function insertLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function patchLead(id: string, data: Partial<Lead>): Promise<Lead> {
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

export async function removeLead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function fetchOpportunities(companyId: string): Promise<Opportunity[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Opportunity[]
}

export async function insertOpportunity(opp: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>): Promise<Opportunity> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .insert(opp)
    .select()
    .single()
  if (error) throw error
  return data as Opportunity
}

export async function patchOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
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

export async function removeOpportunity(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw error
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function fetchClients(companyId: string): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Client[]
}

export async function insertClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()
  if (error) throw error
  return data as Client
}

export async function patchClient(id: string, data: Partial<Client>): Promise<Client> {
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

export async function removeClient(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export async function fetchSites(companyId: string): Promise<Site[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Site[]
}

export async function insertSite(site: Omit<Site, 'id' | 'created_at' | 'updated_at'>): Promise<Site> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()
  if (error) throw error
  return data as Site
}

export async function patchSite(id: string, data: Partial<Site>): Promise<Site> {
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

export async function removeSite(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw error
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export async function fetchAgents(companyId: string): Promise<Agent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Agent[]
}

export async function insertAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agents')
    .insert(agent)
    .select()
    .single()
  if (error) throw error
  return data as Agent
}

export async function patchAgent(id: string, data: Partial<Agent>): Promise<Agent> {
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

export async function removeAgent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('agents').delete().eq('id', id)
  if (error) throw error
}

// ─── SOPs ─────────────────────────────────────────────────────────────────────

export async function fetchSops(companyId: string): Promise<Sop[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sops')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Sop[]
}

export async function insertSop(sop: Omit<Sop, 'id' | 'created_at' | 'updated_at'>): Promise<Sop> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sops')
    .insert(sop)
    .select()
    .single()
  if (error) throw error
  return data as Sop
}

export async function patchSop(id: string, data: Partial<Sop>): Promise<Sop> {
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

export async function removeSop(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sops').delete().eq('id', id)
  if (error) throw error
}

// ─── Missions ─────────────────────────────────────────────────────────────────

export async function fetchMissions(companyId: string): Promise<Mission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('missions')
    .select(`
      *,
      client:clients(*),
      site:sites(*),
      sop:sops(*),
      mission_agents(agent:agents(*))
    `)
    .eq('company_id', companyId)
    .order('scheduled_date', { ascending: false })
  if (error) throw error

  return (data as unknown[]).map((m: unknown) => {
    const mission = m as Record<string, unknown>
    const missionAgents = mission.mission_agents as Array<{ agent: Agent }> | undefined
    return {
      ...mission,
      agents: missionAgents?.map(ma => ma.agent) ?? [],
      mission_agents: undefined,
    } as unknown as Mission
  })
}

export async function insertMission(
  mission: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'client' | 'site' | 'agents' | 'sop'>,
  agentIds: string[]
): Promise<Mission> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('missions')
    .insert(mission)
    .select()
    .single()
  if (error) throw error

  if (agentIds.length > 0) {
    await supabase.from('mission_agents').insert(
      agentIds.map(agent_id => ({ mission_id: data.id, agent_id }))
    )
  }

  return data as Mission
}

export async function patchMission(id: string, data: Partial<Mission>): Promise<Mission> {
  const supabase = createClient()
  const { client: _c, site: _s, agents: _a, sop: _sop, ...rest } = data as Partial<Mission> & Record<string, unknown>
  const { data: updated, error } = await supabase
    .from('missions')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated as Mission
}

export async function removeMission(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('missions').delete().eq('id', id)
  if (error) throw error
}

// ─── Operational Items ────────────────────────────────────────────────────────

export async function fetchOperationalItems(companyId: string): Promise<OperationalItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('operational_items')
    .select('*, client:clients(*), site:sites(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as OperationalItem[]
}

export async function insertOperationalItem(item: Omit<OperationalItem, 'id' | 'created_at' | 'updated_at' | 'client' | 'site'>): Promise<OperationalItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('operational_items')
    .insert(item)
    .select('*, client:clients(*), site:sites(*)')
    .single()
  if (error) throw error
  return data as OperationalItem
}

export async function patchOperationalItem(id: string, data: Partial<OperationalItem>): Promise<OperationalItem> {
  const supabase = createClient()
  const { client: _c, site: _s, ...rest } = data as Partial<OperationalItem> & Record<string, unknown>
  const { data: updated, error } = await supabase
    .from('operational_items')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, client:clients(*), site:sites(*)')
    .single()
  if (error) throw error
  return updated as OperationalItem
}

export async function removeOperationalItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('operational_items').delete().eq('id', id)
  if (error) throw error
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export async function fetchTimeEntries(companyId: string): Promise<TimeEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, agent:agents(*), client:clients(*), site:sites(*)')
    .eq('company_id', companyId)
    .order('date', { ascending: false })
  if (error) throw error
  return data as TimeEntry[]
}

export async function insertTimeEntry(entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'agent' | 'mission' | 'client' | 'site'>): Promise<TimeEntry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data as TimeEntry
}

export async function patchTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry> {
  const supabase = createClient()
  const { agent: _a, mission: _m, client: _c, site: _s, ...rest } = data as Partial<TimeEntry> & Record<string, unknown>
  const { data: updated, error } = await supabase
    .from('time_entries')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated as TimeEntry
}

// ─── Service Types ────────────────────────────────────────────────────────────

export async function fetchServiceTypes(companyId: string): Promise<ServiceType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
  if (error) throw error
  return data as ServiceType[]
}

export async function insertServiceType(st: Omit<ServiceType, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceType> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .insert(st)
    .select()
    .single()
  if (error) throw error
  return data as ServiceType
}

export async function patchServiceType(id: string, data: Partial<ServiceType>): Promise<ServiceType> {
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

export async function removeServiceType(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('service_types').delete().eq('id', id)
  if (error) throw error
}
