import { createClient } from '@/lib/supabase/client'
import { Agent, Client, Site, Lead, Opportunity, Sop, Mission, TimeEntry, OperationalItem } from '@/types'

export const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || 'a0000000-0000-0000-0000-000000000001'

// ─── Read ────────────────────────────────────────────────────────────────────

export async function fetchAllData() {
  const sb = createClient()
  const [agents, clients, sites, leads, opportunities, sops, missions, timeEntries, operationalItems] = await Promise.all([
    sb.from('agents').select('*').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('clients').select('*').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('sites').select('*, clients(*)').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('leads').select('*').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('opportunities').select('*').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('sops').select('*').eq('company_id', COMPANY_ID).order('created_at'),
    sb.from('missions').select('*, clients(*), sites(*), sops(*), mission_agents(agent_id)').eq('company_id', COMPANY_ID).order('scheduled_date', { ascending: false }),
    sb.from('time_entries').select('*, agents(*), clients(*), sites(*)').eq('company_id', COMPANY_ID).order('date', { ascending: false }),
    sb.from('operational_items').select('*, clients(*), sites(*)').eq('company_id', COMPANY_ID).order('created_at'),
  ])
  return {
    agents: agents.data ?? [],
    clients: clients.data ?? [],
    sites: sites.data ?? [],
    leads: leads.data ?? [],
    opportunities: opportunities.data ?? [],
    sops: sops.data ?? [],
    missions: missions.data ?? [],
    timeEntries: timeEntries.data ?? [],
    operationalItems: operationalItems.data ?? [],
  }
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export async function sbAddAgent(agent: Omit<Agent, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('agents').insert({ ...agent, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateAgent(id: string, data: Partial<Agent>) {
  const sb = createClient()
  const { error } = await sb.from('agents').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteAgent(id: string) {
  const sb = createClient()
  const { error } = await sb.from('agents').delete().eq('id', id)
  if (error) throw error
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function sbAddClient(client: Omit<Client, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('clients').insert({ ...client, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateClient(id: string, data: Partial<Client>) {
  const sb = createClient()
  const { error } = await sb.from('clients').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteClient(id: string) {
  const sb = createClient()
  const { error } = await sb.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── Sites ───────────────────────────────────────────────────────────────────

export async function sbAddSite(site: Omit<Site, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('sites').insert({ ...site, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateSite(id: string, data: Partial<Site>) {
  const sb = createClient()
  const { error } = await sb.from('sites').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteSite(id: string) {
  const sb = createClient()
  const { error } = await sb.from('sites').delete().eq('id', id)
  if (error) throw error
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export async function sbAddLead(lead: Omit<Lead, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('leads').insert({ ...lead, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateLead(id: string, data: Partial<Lead>) {
  const sb = createClient()
  const { error } = await sb.from('leads').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteLead(id: string) {
  const sb = createClient()
  const { error } = await sb.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ─── Opportunities ───────────────────────────────────────────────────────────

export async function sbAddOpportunity(opp: Omit<Opportunity, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('opportunities').insert({ ...opp, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateOpportunity(id: string, data: Partial<Opportunity>) {
  const sb = createClient()
  const { error } = await sb.from('opportunities').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteOpportunity(id: string) {
  const sb = createClient()
  const { error } = await sb.from('opportunities').delete().eq('id', id)
  if (error) throw error
}

// ─── Missions ────────────────────────────────────────────────────────────────

export async function sbAddMission(
  mission: Omit<Mission, 'id' | 'client' | 'site' | 'agents' | 'sop'>,
  agentIds: string[]
) {
  const sb = createClient()
  const { data, error } = await sb.from('missions').insert({ ...mission, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  if (agentIds.length > 0) {
    await sb.from('mission_agents').insert(agentIds.map(agent_id => ({ mission_id: data.id, agent_id })))
  }
  return data
}

export async function sbUpdateMission(id: string, data: Partial<Mission>) {
  const sb = createClient()
  const { agents, client, site, sop, ...rest } = data as Mission
  const { error } = await sb.from('missions').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbUpdateMissionStatus(id: string, status: string, validatedHours?: number) {
  const sb = createClient()
  const now = new Date().toISOString()
  const { error } = await sb.from('missions').update({ status, updated_at: now }).eq('id', id)
  if (error) throw error
  if (validatedHours !== undefined) {
    await sb.from('time_entries').update({
      status: 'validee',
      validated_hours: validatedHours,
      validated_at: now,
    }).eq('mission_id', id)
  }
}

// ─── SOPs ────────────────────────────────────────────────────────────────────

export async function sbAddSop(sop: Omit<Sop, 'id'>) {
  const sb = createClient()
  const { data, error } = await sb.from('sops').insert({ ...sop, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateSop(id: string, data: Partial<Sop>) {
  const sb = createClient()
  const { error } = await sb.from('sops').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteSop(id: string) {
  const sb = createClient()
  const { error } = await sb.from('sops').delete().eq('id', id)
  if (error) throw error
}

// ─── Time Entries ────────────────────────────────────────────────────────────

export async function sbAddTimeEntry(entry: Omit<TimeEntry, 'id'>) {
  const sb = createClient()
  const { agent, mission, client, site, ...rest } = entry as TimeEntry
  const { data, error } = await sb.from('time_entries').insert({ ...rest, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateTimeEntry(id: string, data: Partial<TimeEntry>) {
  const sb = createClient()
  const { agent, mission, client, site, ...rest } = data as TimeEntry
  const { error } = await sb.from('time_entries').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ─── Operational Items ───────────────────────────────────────────────────────

export async function sbAddOperationalItem(item: Omit<OperationalItem, 'id' | 'client' | 'site'>) {
  const sb = createClient()
  const { data, error } = await sb.from('operational_items').insert({ ...item, company_id: COMPANY_ID }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdateOperationalItem(id: string, data: Partial<OperationalItem>) {
  const sb = createClient()
  const { client, site, ...rest } = data as OperationalItem
  const { error } = await sb.from('operational_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function sbDeleteOperationalItem(id: string) {
  const sb = createClient()
  const { error } = await sb.from('operational_items').delete().eq('id', id)
  if (error) throw error
}
