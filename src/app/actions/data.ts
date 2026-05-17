'use server'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem,
  Site, Sop, TimeEntry, ServiceType, Quote,
} from '@/types'

/**
 * Snapshot of all tenant-scoped business data, fetched in one parallel batch
 * and pushed into the Zustand store by SupabaseHydrator at mount time.
 *
 * RLS does the company filtering server-side — we never pass company_id from
 * the client. Returns `null` when Supabase isn't configured (dummy mode).
 */
export interface CompanyDataSnapshot {
  agents: Agent[]
  clients: Client[]
  sites: Site[]
  leads: Lead[]
  opportunities: Opportunity[]
  missions: Mission[]
  operationalItems: OperationalItem[]
  sops: Sop[]
  timeEntries: TimeEntry[]
  serviceTypes: ServiceType[]
  quotes: Quote[]
}

const EMPTY: CompanyDataSnapshot = {
  agents: [], clients: [], sites: [], leads: [], opportunities: [],
  missions: [], operationalItems: [], sops: [], timeEntries: [],
  serviceTypes: [], quotes: [],
}

export async function loadCompanyData(): Promise<CompanyDataSnapshot | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await createServerClient()
  if (!supabase) return null

  // Auth check — RLS would reject anonymous queries anyway, but a clean null
  // lets the client fallback to dummy mode without spamming console errors.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    agents, clients, sites, leads, opportunities,
    missions, operationalItems, sops, timeEntries,
    serviceTypes, quotes,
  ] = await Promise.all([
    supabase.from('agents').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('sites').select('*').order('created_at', { ascending: false }),
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
    supabase.from('missions').select('*').order('scheduled_date', { ascending: false }),
    supabase.from('operational_items').select('*').order('created_at', { ascending: false }),
    supabase.from('sops').select('*').order('created_at', { ascending: false }),
    supabase.from('time_entries').select('*').order('date', { ascending: false }),
    supabase.from('service_types').select('*').order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').order('created_at', { ascending: false }),
  ])

  return {
    ...EMPTY,
    agents: (agents.data ?? []) as Agent[],
    clients: (clients.data ?? []) as Client[],
    sites: (sites.data ?? []) as Site[],
    leads: (leads.data ?? []) as Lead[],
    opportunities: (opportunities.data ?? []) as Opportunity[],
    missions: (missions.data ?? []) as Mission[],
    operationalItems: (operationalItems.data ?? []) as OperationalItem[],
    sops: (sops.data ?? []) as Sop[],
    timeEntries: (timeEntries.data ?? []) as TimeEntry[],
    serviceTypes: (serviceTypes.data ?? []) as ServiceType[],
    quotes: (quotes.data ?? []) as Quote[],
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Write actions — one per entity. Always upsert with company_id forced from  */
/* the authenticated profile (never trust client-provided company_id).        */
/* ────────────────────────────────────────────────────────────────────────── */

export type WriteResult = { ok: true } | { ok: false; error: string }

async function getAuthedCompanyId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await createServerClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  return profile?.company_id ?? null
}

/**
 * Generic upsert helper. The client-side store generates the row with an
 * already-set company_id and id (UUID), so on the server we just override
 * company_id with the authenticated value and let Supabase upsert by PK.
 *
 * Joined fields (client, site, agents…) prefixed `_` in the API are stripped.
 */
function stripJoins<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row }
  for (const k of Object.keys(out)) {
    const v = (out as Record<string, unknown>)[k]
    if (
      k === 'client' || k === 'site' || k === 'agents' || k === 'sop' ||
      k === 'agent' || k === 'mission' || k === 'sites'
    ) {
      delete (out as Record<string, unknown>)[k]
    } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
      // Nested arrays of objects (rare) are stripped to avoid PostgREST errors
      delete (out as Record<string, unknown>)[k]
    }
  }
  return out
}

async function upsert(table: string, row: Record<string, unknown>): Promise<WriteResult> {
  const companyId = await getAuthedCompanyId()
  if (!companyId) return { ok: false, error: 'Non authentifié' }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  const payload = { ...stripJoins(row), company_id: companyId }
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

async function remove(table: string, id: string): Promise<WriteResult> {
  const companyId = await getAuthedCompanyId()
  if (!companyId) return { ok: false, error: 'Non authentifié' }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }
  // RLS already restricts to current company; we still defend with eq().
  const { error } = await supabase.from(table).delete().eq('id', id).eq('company_id', companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/* Per-entity wrappers — same signature for everyone. */

export async function upsertAgent(row: Agent): Promise<WriteResult> {
  const r = await upsert('agents', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/rh/agents')
  return r
}
export async function deleteAgent(id: string): Promise<WriteResult> {
  const r = await remove('agents', id)
  if (r.ok) revalidatePath('/rh/agents')
  return r
}

export async function upsertClient(row: Client): Promise<WriteResult> {
  const r = await upsert('clients', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}
export async function deleteClient(id: string): Promise<WriteResult> {
  const r = await remove('clients', id)
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}

export async function upsertSite(row: Site): Promise<WriteResult> {
  const r = await upsert('sites', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}
export async function deleteSite(id: string): Promise<WriteResult> {
  const r = await remove('sites', id)
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}

export async function upsertLead(row: Lead): Promise<WriteResult> {
  return upsert('leads', row as unknown as Record<string, unknown>)
}
export async function deleteLead(id: string): Promise<WriteResult> {
  return remove('leads', id)
}

export async function upsertOpportunity(row: Opportunity): Promise<WriteResult> {
  const r = await upsert('opportunities', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/commercial/pipeline')
  return r
}
export async function deleteOpportunity(id: string): Promise<WriteResult> {
  const r = await remove('opportunities', id)
  if (r.ok) revalidatePath('/commercial/pipeline')
  return r
}

export async function upsertMission(row: Mission): Promise<WriteResult> {
  const r = await upsert('missions', row as unknown as Record<string, unknown>)
  if (r.ok) {
    revalidatePath('/operations/cockpit')
    revalidatePath('/operations/missions-du-jour')
  }
  return r
}
export async function deleteMission(id: string): Promise<WriteResult> {
  const r = await remove('missions', id)
  if (r.ok) revalidatePath('/operations/cockpit')
  return r
}

/** Sync mission_agents join table with a desired set of agent ids. */
export async function assignAgentsToMission(missionId: string, agentIds: string[]): Promise<WriteResult> {
  const companyId = await getAuthedCompanyId()
  if (!companyId) return { ok: false, error: 'Non authentifié' }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  // RLS scopes mission_agents via the parent mission, so the company check
  // is implicit. We still confirm the mission belongs to us.
  const { data: mission } = await supabase
    .from('missions')
    .select('id, company_id')
    .eq('id', missionId)
    .single()
  if (!mission || mission.company_id !== companyId) {
    return { ok: false, error: 'Mission introuvable' }
  }

  // Wipe then insert — cheaper than diffing for small N.
  await supabase.from('mission_agents').delete().eq('mission_id', missionId)
  if (agentIds.length > 0) {
    const rows = agentIds.map(agent_id => ({ mission_id: missionId, agent_id }))
    const { error } = await supabase.from('mission_agents').insert(rows)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/operations/cockpit')
  return { ok: true }
}

export async function upsertTimeEntry(row: TimeEntry): Promise<WriteResult> {
  const r = await upsert('time_entries', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/rh/heures-paie')
  return r
}

export async function upsertSop(row: Sop): Promise<WriteResult> {
  const r = await upsert('sops', row as unknown as Record<string, unknown>)
  if (r.ok) revalidatePath('/operations/sop')
  return r
}
export async function deleteSop(id: string): Promise<WriteResult> {
  const r = await remove('sops', id)
  if (r.ok) revalidatePath('/operations/sop')
  return r
}

export async function upsertServiceType(row: ServiceType): Promise<WriteResult> {
  return upsert('service_types', row as unknown as Record<string, unknown>)
}
export async function deleteServiceType(id: string): Promise<WriteResult> {
  return remove('service_types', id)
}

export async function upsertQuote(row: Quote): Promise<WriteResult> {
  return upsert('quotes', row as unknown as Record<string, unknown>)
}
export async function deleteQuote(id: string): Promise<WriteResult> {
  return remove('quotes', id)
}

export async function upsertOperationalItem(row: OperationalItem): Promise<WriteResult> {
  return upsert('operational_items', row as unknown as Record<string, unknown>)
}
export async function deleteOperationalItem(id: string): Promise<WriteResult> {
  return remove('operational_items', id)
}
