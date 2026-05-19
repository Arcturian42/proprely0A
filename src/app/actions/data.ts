'use server'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { missionAssignedEmail } from '@/lib/email/templates'
import { hasTimeOverlap, minutesToTime, timeToMinutes } from '@/lib/scheduling/overlap'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getEntitySchema } from '@/lib/schemas/entities'
import type { Permission } from '@/lib/auth/types'
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

  // Pagination defaults — keep the initial hydrate snapshot under a few MB
  // even for power users. UI can fetch more on demand later (V1).
  // - Missions/time-entries: only the recent window matters for cockpit/planning.
  // - Leads/opportunities: filter out closed ones (gagne/perdu are archives).
  // - Quotes: same — terminal states stay accessible via the opportunity card.
  const MISSIONS_LIMIT = 200
  const TIME_ENTRIES_DAYS = 90
  const QUOTES_LIMIT = 200
  const LEADS_LIMIT = 500
  const sinceISO = new Date(Date.now() - TIME_ENTRIES_DAYS * 86400000).toISOString().slice(0, 10)

  const [
    agents, clients, sites, leads, opportunities,
    missions, operationalItems, sops, timeEntries,
    serviceTypes, quotes,
  ] = await Promise.all([
    // archived_at IS NULL on the three soft-deleted tables — archived rows
    // stay in the DB for history but never reach the UI snapshot.
    supabase.from('agents').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    supabase.from('clients').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    supabase.from('sites').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    supabase.from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LEADS_LIMIT),
    supabase.from('opportunities')
      .select('*')
      .order('created_at', { ascending: false }),
    // Join mission_agents so mission.agents survives a refresh — Zustand
    // stores the array client-side after assignAgentsToMission, but it'd be
    // dropped on next hydrate without this select expansion.
    supabase.from('missions')
      .select('*, mission_agents(agent_id)')
      .order('scheduled_date', { ascending: false })
      .limit(MISSIONS_LIMIT),
    supabase.from('operational_items').select('*').order('created_at', { ascending: false }),
    supabase.from('sops').select('*').order('created_at', { ascending: false }),
    supabase.from('time_entries')
      .select('*')
      .gte('date', sinceISO)
      .order('date', { ascending: false }),
    supabase.from('service_types').select('*').order('created_at', { ascending: false }),
    supabase.from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(QUOTES_LIMIT),
  ])

  const agentsList = (agents.data ?? []) as Agent[]
  const clientsList = (clients.data ?? []) as Client[]
  const sitesList = (sites.data ?? []) as Site[]
  const sopsList = (sops.data ?? []) as Sop[]
  const agentsById = new Map(agentsList.map(a => [a.id, a]))
  const clientsById = new Map(clientsList.map(c => [c.id, c]))
  const sitesById = new Map(sitesList.map(s => [s.id, s]))
  const sopsById = new Map(sopsList.map(s => [s.id, s]))

  // Reconstitute denormalised joins (client/site/sop/agents) on missions —
  // the UI reads them directly (mission.client.name, mission.agents[].first_name).
  type MissionRow = Mission & { mission_agents?: { agent_id: string }[] }
  const missionsEnriched: Mission[] = ((missions.data ?? []) as MissionRow[]).map(m => ({
    ...m,
    client: m.client_id ? clientsById.get(m.client_id) : undefined,
    site: m.site_id ? sitesById.get(m.site_id) : undefined,
    sop: m.sop_id ? sopsById.get(m.sop_id) : undefined,
    agents: (m.mission_agents ?? [])
      .map(ma => agentsById.get(ma.agent_id))
      .filter((a): a is Agent => Boolean(a)),
    mission_agents: undefined,
  }))

  return {
    ...EMPTY,
    agents: agentsList,
    clients: clientsList,
    sites: sitesList,
    leads: (leads.data ?? []) as Lead[],
    opportunities: (opportunities.data ?? []) as Opportunity[],
    missions: missionsEnriched,
    operationalItems: (operationalItems.data ?? []) as OperationalItem[],
    sops: sopsList,
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

/**
 * Generic upsert helper. The client-side store generates the row with an
 * already-set company_id and id (UUID), so on the server we just override
 * company_id with the authenticated value and let Supabase upsert by PK.
 *
 * Joined fields (client, site, agents…) prefixed `_` in the API are stripped.
 */
// Explicit allow-list of joined object keys to strip before upsert. Adding
// "remove any array of objects" was tempting but silently broke legitimate
// payloads like SOP.checklist_items[]. If you add a new join, list it here.
const JOIN_KEYS = new Set([
  'client', 'site', 'agents', 'sop', 'agent', 'mission', 'sites',
])

function stripJoins<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row }
  for (const k of Object.keys(out)) {
    if (JOIN_KEYS.has(k)) {
      delete (out as Record<string, unknown>)[k]
    }
  }
  return out
}

async function upsert(
  table: string,
  row: Record<string, unknown>,
  permission: Permission,
): Promise<WriteResult> {
  const guard = await requirePermission(permission)
  if (!guard.ok) return { ok: false, error: guard.error }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  const stripped = stripJoins(row)

  // App-level validation before the DB sees the payload. Strips junk fields
  // and gives a clean French error instead of a Postgres CHECK violation.
  const schema = getEntitySchema(table)
  if (schema) {
    const parsed = schema.safeParse(stripped)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const path = issue?.path?.join('.') || 'champ'
      return { ok: false, error: `Données invalides (${path}) : ${issue?.message ?? 'format incorrect'}` }
    }
  }

  const payload = { ...stripped, company_id: guard.caller.companyId }
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Tables that soft-delete (set archived_at) instead of DELETE. Hard delete
// on these would cascade to missions/time_entries via FK and silently destroy
// history — bad for a SaaS the user is expected to trust. See migration
// 20260519000000_soft_delete.sql for the schema side.
const SOFT_DELETE_TABLES = new Set(['clients', 'sites', 'agents'])

async function remove(
  table: string,
  id: string,
  permission: Permission,
): Promise<WriteResult> {
  const guard = await requirePermission(permission)
  if (!guard.ok) return { ok: false, error: guard.error }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  // RLS already restricts to current company; eq() is belt-and-braces.
  if (SOFT_DELETE_TABLES.has(table)) {
    const { error } = await supabase
      .from(table).update({ archived_at: new Date().toISOString() })
      .eq('id', id).eq('company_id', guard.caller.companyId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const { error } = await supabase
    .from(table).delete()
    .eq('id', id).eq('company_id', guard.caller.companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/* Per-entity wrappers — same signature for everyone. Each declares the RBAC
 * permission it requires; requirePermission() inside upsert/remove enforces
 * it server-side regardless of what the UI hides. */

export async function upsertAgent(row: Agent): Promise<WriteResult> {
  const r = await upsert('agents', row as unknown as Record<string, unknown>, 'agent:write')
  if (r.ok) revalidatePath('/rh/agents')
  return r
}
export async function deleteAgent(id: string): Promise<WriteResult> {
  const r = await remove('agents', id, 'agent:write')
  if (r.ok) revalidatePath('/rh/agents')
  return r
}

export async function upsertClient(row: Client): Promise<WriteResult> {
  const r = await upsert('clients', row as unknown as Record<string, unknown>, 'client:write')
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}
export async function deleteClient(id: string): Promise<WriteResult> {
  const r = await remove('clients', id, 'client:delete')
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}

export async function upsertSite(row: Site): Promise<WriteResult> {
  const r = await upsert('sites', row as unknown as Record<string, unknown>, 'site:write')
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}
export async function deleteSite(id: string): Promise<WriteResult> {
  const r = await remove('sites', id, 'site:write')
  if (r.ok) revalidatePath('/commercial/clients-sites')
  return r
}

export async function upsertLead(row: Lead): Promise<WriteResult> {
  return upsert('leads', row as unknown as Record<string, unknown>, 'lead:write')
}
export async function deleteLead(id: string): Promise<WriteResult> {
  return remove('leads', id, 'lead:write')
}

export async function upsertOpportunity(row: Opportunity): Promise<WriteResult> {
  const r = await upsert('opportunities', row as unknown as Record<string, unknown>, 'opportunity:write')
  if (r.ok) revalidatePath('/commercial/pipeline')
  return r
}
export async function deleteOpportunity(id: string): Promise<WriteResult> {
  const r = await remove('opportunities', id, 'opportunity:write')
  if (r.ok) revalidatePath('/commercial/pipeline')
  return r
}

export async function upsertMission(row: Mission): Promise<WriteResult> {
  const r = await upsert('missions', row as unknown as Record<string, unknown>, 'mission:write')
  if (r.ok) {
    revalidatePath('/operations/cockpit')
    revalidatePath('/operations/missions-du-jour')
  }
  return r
}
export async function deleteMission(id: string): Promise<WriteResult> {
  const r = await remove('missions', id, 'mission:write')
  if (r.ok) revalidatePath('/operations/cockpit')
  return r
}

/** Sync mission_agents join table with a desired set of agent ids. */
export async function assignAgentsToMission(missionId: string, agentIds: string[]): Promise<WriteResult> {
  const guard = await requirePermission('mission:assign')
  if (!guard.ok) return { ok: false, error: guard.error }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  // RLS scopes mission_agents via the parent mission, so the company check
  // is implicit. We still confirm the mission belongs to us.
  const { data: mission } = await supabase
    .from('missions')
    .select('id, company_id, scheduled_date, start_time, planned_hours')
    .eq('id', missionId)
    .single<{
      id: string
      company_id: string
      scheduled_date: string | null
      start_time: string | null
      planned_hours: number | null
    }>()
  if (!mission || mission.company_id !== guard.caller.companyId) {
    return { ok: false, error: 'Mission introuvable' }
  }

  // Conflict detection : block hard if any agent is already booked on an
  // overlapping mission the same day. RLS guarantees we only see same-tenant
  // missions, so no cross-company leak here.
  if (agentIds.length > 0 && mission.scheduled_date && mission.start_time && mission.planned_hours) {
    const conflict = await detectAgentConflicts(
      supabase,
      missionId,
      mission.scheduled_date,
      mission.start_time,
      mission.planned_hours,
      agentIds,
    )
    if (conflict) return { ok: false, error: conflict }
  }

  // Figure out which agents are NEW assignments — we only email those, not
  // the ones who were already on the mission (would spam them on every save).
  const { data: existing } = await supabase
    .from('mission_agents')
    .select('agent_id')
    .eq('mission_id', missionId)
  const existingIds = new Set((existing ?? []).map(r => r.agent_id))
  const newlyAssigned = agentIds.filter(id => !existingIds.has(id))

  // Wipe then insert — cheaper than diffing for small N.
  await supabase.from('mission_agents').delete().eq('mission_id', missionId)
  if (agentIds.length > 0) {
    const rows = agentIds.map(agent_id => ({ mission_id: missionId, agent_id }))
    const { error } = await supabase.from('mission_agents').insert(rows)
    if (error) return { ok: false, error: error.message }
  }

  // Best-effort notification email to newly assigned agents.
  if (newlyAssigned.length > 0 && isResendConfigured()) {
    notifyNewlyAssigned(supabase, missionId, newlyAssigned).catch(() => undefined)
  }

  revalidatePath('/operations/cockpit')
  return { ok: true }
}

/**
 * Returns a French error message describing any overlap, or null when the
 * assignment is safe. We do this in one round-trip: fetch all same-day
 * missions for the candidate agents (excluding the target mission), then
 * compute overlap in JS via the pure hasTimeOverlap helper.
 */
async function detectAgentConflicts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  targetMissionId: string,
  targetDate: string,
  targetStartTime: string,
  targetPlannedHours: number,
  agentIds: string[],
): Promise<string | null> {
  const { data: rows } = await supabase
    .from('mission_agents')
    .select(
      'agent_id, mission:missions!inner(id, scheduled_date, start_time, planned_hours), agent:agents(first_name, last_name)',
    )
    .in('agent_id', agentIds)
    .neq('mission_id', targetMissionId)
    .eq('mission.scheduled_date', targetDate)

  if (!rows || rows.length === 0) return null

  type Row = {
    agent_id: string
    mission: { id: string; scheduled_date: string; start_time: string | null; planned_hours: number | null } | null
    agent: { first_name: string | null; last_name: string | null } | null
  }
  const target = { start_time: targetStartTime, planned_hours: targetPlannedHours }
  for (const row of rows as Row[]) {
    if (!row.mission?.start_time || !row.mission.planned_hours) continue
    const other = {
      start_time: row.mission.start_time,
      planned_hours: row.mission.planned_hours,
    }
    if (hasTimeOverlap(target, other)) {
      const name =
        [row.agent?.first_name, row.agent?.last_name].filter(Boolean).join(' ') ||
        'Un agent'
      const fmtStart = row.mission.start_time.slice(0, 5)
      const otherEnd =
        timeToMinutes(row.mission.start_time) +
        Math.round(row.mission.planned_hours * 60)
      const fmtEnd = minutesToTime(otherEnd)
      return `${name} est déjà sur une mission le ${targetDate} de ${fmtStart} à ${fmtEnd}. Décale l'une des deux missions ou choisis un autre agent.`
    }
  }
  return null
}

async function notifyNewlyAssigned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  missionId: string,
  agentIds: string[],
): Promise<void> {
  const { data: mission } = await supabase
    .from('missions')
    .select('scheduled_date, start_time, planned_hours, clients(name), sites(name)')
    .eq('id', missionId)
    .single()
  if (!mission) return
  const { data: agentRows } = await supabase
    .from('agents')
    .select('id, email, first_name')
    .in('id', agentIds)
  for (const agent of (agentRows ?? []) as { email: string | null; first_name: string }[]) {
    if (!agent.email) continue
    const tpl = missionAssignedEmail({
      agentFirstName: agent.first_name || 'agent',
      clientName: mission.clients?.name ?? 'Client',
      siteName: mission.sites?.name ?? null,
      scheduledDate: mission.scheduled_date,
      startTime: mission.start_time,
      plannedHours: mission.planned_hours,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    })
    await sendEmail({ to: agent.email, ...tpl }).catch(() => undefined)
  }
}

export async function upsertTimeEntry(row: TimeEntry): Promise<WriteResult> {
  const r = await upsert('time_entries', row as unknown as Record<string, unknown>, 'time:write')
  if (r.ok) revalidatePath('/rh/heures-paie')
  return r
}

export async function upsertSop(row: Sop): Promise<WriteResult> {
  const r = await upsert('sops', row as unknown as Record<string, unknown>, 'sop:write')
  if (r.ok) revalidatePath('/operations/sop')
  return r
}
export async function deleteSop(id: string): Promise<WriteResult> {
  const r = await remove('sops', id, 'sop:write')
  if (r.ok) revalidatePath('/operations/sop')
  return r
}

export async function upsertServiceType(row: ServiceType): Promise<WriteResult> {
  return upsert('service_types', row as unknown as Record<string, unknown>, 'settings:write')
}
export async function deleteServiceType(id: string): Promise<WriteResult> {
  return remove('service_types', id, 'settings:write')
}

export async function upsertQuote(row: Quote): Promise<WriteResult> {
  return upsert('quotes', row as unknown as Record<string, unknown>, 'opportunity:write')
}
export async function deleteQuote(id: string): Promise<WriteResult> {
  return remove('quotes', id, 'opportunity:write')
}

export async function upsertOperationalItem(row: OperationalItem): Promise<WriteResult> {
  return upsert('operational_items', row as unknown as Record<string, unknown>, 'mission:write')
}
export async function deleteOperationalItem(id: string): Promise<WriteResult> {
  return remove('operational_items', id, 'mission:write')
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Company info — owner-only update on the companies table.                   */
/* ────────────────────────────────────────────────────────────────────────── */

const CompanyInfoSchema = z.object({
  name: z.string().min(2, 'Nom requis').max(200),
  email: z.string().email('Email invalide').or(z.literal('')).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
})

export async function updateCompanyInfo(formData: FormData): Promise<WriteResult> {
  const parsed = CompanyInfoSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') ?? undefined,
    phone: formData.get('phone') ?? undefined,
    address: formData.get('address') ?? undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  // RLS only allows owner to update companies (rls.sql companies_update),
  // but we double-check with the RBAC matrix for a clean French error.
  const guard = await requirePermission('company:write')
  if (!guard.ok) return { ok: false, error: guard.error }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', guard.caller.companyId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true }
}
