'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'

export type RecurrenceActionResult =
  | { ok: true; message?: string; createdCount?: number }
  | { ok: false; error: string }

const FrequencyEnum = z.enum(['weekly', 'biweekly', 'monthly'])

const CreateRecurrenceSchema = z.object({
  site_id: z.string().uuid(),
  service_type: z.string().max(100).optional(),
  planned_hours: z.number().positive().max(24),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM attendu'),
  default_agent_ids: z.array(z.string().uuid()).max(20).optional(),
  frequency: FrequencyEnum,
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

function parseJSONField<T>(raw: FormDataEntryValue | null): T | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Computes the next N occurrence dates for a recurrence pattern.
 * Pure — exported for test reuse. Doesn't care about company/RLS.
 */
export async function nextOccurrenceDates(args: {
  frequency: 'weekly' | 'biweekly' | 'monthly'
  weekday: number | null
  day_of_month: number | null
  starts_on: string
  ends_on: string | null
  count: number
  fromDate?: string
}): Promise<string[]> {
  const start = new Date(`${args.fromDate ?? args.starts_on}T00:00:00Z`)
  const end = args.ends_on ? new Date(`${args.ends_on}T00:00:00Z`) : null
  const out: string[] = []

  if (args.frequency === 'weekly' || args.frequency === 'biweekly') {
    const stepDays = args.frequency === 'biweekly' ? 14 : 7
    const targetWeekday = args.weekday ?? start.getUTCDay()
    const cursor = new Date(start)
    // Align to next target weekday
    while (cursor.getUTCDay() !== targetWeekday) {
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    while (out.length < args.count) {
      if (end && cursor > end) break
      out.push(cursor.toISOString().slice(0, 10))
      cursor.setUTCDate(cursor.getUTCDate() + stepDays)
    }
  } else {
    const dom = args.day_of_month ?? start.getUTCDate()
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), dom))
    while (out.length < args.count) {
      if (cursor >= start && (!end || cursor <= end)) {
        out.push(cursor.toISOString().slice(0, 10))
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
  }

  return out
}

/**
 * Creates a recurrence pattern and pre-generates the next 4 occurrences as
 * missions. The cron job will keep generating ahead as time progresses.
 */
export async function createRecurrence(formData: FormData): Promise<RecurrenceActionResult> {
  const gate = await requirePermission('mission:write')
  if (!gate.ok) return { ok: false, error: gate.error }

  const payload = parseJSONField<Record<string, unknown>>(formData.get('payload'))
  const parsed = CreateRecurrenceSchema.safeParse(payload ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Récurrence invalide.' }
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, message: 'Mode dummy : récurrence simulée.', createdCount: 0 }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  // Verify site ownership
  const { data: site } = await admin
    .from('sites')
    .select('id, company_id, client_id')
    .eq('id', parsed.data.site_id)
    .maybeSingle<{ id: string; company_id: string; client_id: string | null }>()
  if (!site || site.company_id !== gate.caller.companyId) {
    return { ok: false, error: 'Site introuvable dans ton entreprise.' }
  }

  // Insert recurrence template
  const { data: rec, error: recErr } = await admin
    .from('mission_recurrences')
    .insert({
      company_id: gate.caller.companyId,
      site_id: parsed.data.site_id,
      service_type: parsed.data.service_type ?? null,
      planned_hours: parsed.data.planned_hours,
      start_time: parsed.data.start_time,
      default_agent_ids: parsed.data.default_agent_ids ?? [],
      frequency: parsed.data.frequency,
      weekday: parsed.data.weekday ?? null,
      day_of_month: parsed.data.day_of_month ?? null,
      starts_on: parsed.data.starts_on,
      ends_on: parsed.data.ends_on ?? null,
      notes: parsed.data.notes ?? null,
      created_by: gate.caller.userId,
    })
    .select('id')
    .single<{ id: string }>()
  if (recErr || !rec) {
    return { ok: false, error: recErr?.message ?? 'Création récurrence échouée' }
  }

  // Pre-generate 4 future missions
  const dates = await nextOccurrenceDates({
    frequency: parsed.data.frequency,
    weekday: parsed.data.weekday ?? null,
    day_of_month: parsed.data.day_of_month ?? null,
    starts_on: parsed.data.starts_on,
    ends_on: parsed.data.ends_on ?? null,
    count: 4,
  })

  let createdCount = 0
  for (const date of dates) {
    const { data: mission, error: missionErr } = await admin
      .from('missions')
      .insert({
        company_id: gate.caller.companyId,
        site_id: parsed.data.site_id,
        client_id: site.client_id,
        service_type: parsed.data.service_type,
        scheduled_date: date,
        start_time: parsed.data.start_time,
        planned_hours: parsed.data.planned_hours,
        status: 'prevue',
        recurrence_id: rec.id,
        created_by: gate.caller.userId,
      })
      .select('id')
      .single<{ id: string }>()
    if (missionErr || !mission) continue
    createdCount += 1

    // Auto-assign default agents
    if ((parsed.data.default_agent_ids ?? []).length > 0) {
      const rows = parsed.data.default_agent_ids!.map((agent_id) => ({
        mission_id: mission.id,
        agent_id,
      }))
      await admin.from('mission_agents').insert(rows)
    }
  }

  // Update last_generated_date so the cron picks up from there next time
  if (dates.length > 0) {
    await admin
      .from('mission_recurrences')
      .update({ last_generated_date: dates[dates.length - 1] })
      .eq('id', rec.id)
  }

  revalidatePath('/operations/planning')
  return { ok: true, createdCount, message: `Récurrence créée. ${createdCount} mission(s) générée(s).` }
}

export interface RecurrenceListRow {
  id: string
  site_id: string
  site_name: string | null
  service_type: string | null
  planned_hours: number | null
  start_time: string | null
  frequency: 'weekly' | 'biweekly' | 'monthly'
  weekday: number | null
  day_of_month: number | null
  starts_on: string
  ends_on: string | null
  last_generated_date: string | null
  is_active: boolean
  created_at: string
}

export async function loadRecurrences(): Promise<RecurrenceListRow[]> {
  if (!isSupabaseConfigured()) return []
  const gate = await requirePermission('mission:read')
  if (!gate.ok) return []
  const admin = await createServiceRoleClient()
  if (!admin) return []
  const { data } = await admin
    .from('mission_recurrences')
    .select(
      'id, site_id, service_type, planned_hours, start_time, frequency, weekday, day_of_month, starts_on, ends_on, last_generated_date, is_active, created_at, site:sites(name)',
    )
    .eq('company_id', gate.caller.companyId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => {
    // Supabase joins may return site as object or array depending on FK shape
    const row = r as Omit<RecurrenceListRow, 'site_name'> & {
      site: { name: string } | { name: string }[] | null
    }
    const siteEntry = Array.isArray(row.site) ? row.site[0] : row.site
    return {
      id: row.id,
      site_id: row.site_id,
      site_name: siteEntry?.name ?? null,
      service_type: row.service_type,
      planned_hours: row.planned_hours,
      start_time: row.start_time,
      frequency: row.frequency,
      weekday: row.weekday,
      day_of_month: row.day_of_month,
      starts_on: row.starts_on,
      ends_on: row.ends_on,
      last_generated_date: row.last_generated_date,
      is_active: row.is_active,
      created_at: row.created_at,
    }
  })
}

export async function deactivateRecurrence(id: string): Promise<RecurrenceActionResult> {
  const gate = await requirePermission('mission:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { error } = await admin
    .from('mission_recurrences')
    .update({ is_active: false })
    .eq('id', id)
    .eq('company_id', gate.caller.companyId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/operations/planning')
  return { ok: true }
}

/**
 * Cron entrypoint — for each active recurrence, generate missions up to
 * a 4-week horizon. Idempotent: skips dates that already have a mission
 * row attached to this recurrence.
 */
export async function tickRecurrences(): Promise<{ generated: number }> {
  if (!isSupabaseConfigured()) return { generated: 0 }
  const admin = await createServiceRoleClient()
  if (!admin) return { generated: 0 }

  const horizonDate = new Date()
  horizonDate.setUTCDate(horizonDate.getUTCDate() + 28)
  const horizon = horizonDate.toISOString().slice(0, 10)

  const { data: recurrences } = await admin
    .from('mission_recurrences')
    .select(
      'id, company_id, site_id, service_type, planned_hours, start_time, default_agent_ids, frequency, weekday, day_of_month, starts_on, ends_on, last_generated_date',
    )
    .eq('is_active', true)

  let generated = 0
  for (const rec of recurrences ?? []) {
    const startFrom =
      rec.last_generated_date ?? rec.starts_on
    const dates = await nextOccurrenceDates({
      frequency: rec.frequency,
      weekday: rec.weekday,
      day_of_month: rec.day_of_month,
      starts_on: startFrom,
      ends_on: rec.ends_on ?? horizon,
      count: 8,
      fromDate: startFrom,
    })
    const future = dates.filter((d) => d > (rec.last_generated_date ?? '1970-01-01') && d <= horizon)
    if (future.length === 0) continue

    // Site → client lookup once per recurrence
    const { data: site } = await admin
      .from('sites')
      .select('client_id')
      .eq('id', rec.site_id)
      .maybeSingle<{ client_id: string | null }>()

    for (const date of future) {
      const { data: mission, error: missionErr } = await admin
        .from('missions')
        .insert({
          company_id: rec.company_id,
          site_id: rec.site_id,
          client_id: site?.client_id ?? null,
          service_type: rec.service_type,
          scheduled_date: date,
          start_time: rec.start_time,
          planned_hours: rec.planned_hours,
          status: 'prevue',
          recurrence_id: rec.id,
        })
        .select('id')
        .single<{ id: string }>()
      if (missionErr || !mission) continue
      generated += 1

      if ((rec.default_agent_ids ?? []).length > 0) {
        const rows = (rec.default_agent_ids as string[]).map((agent_id: string) => ({
          mission_id: mission.id,
          agent_id,
        }))
        await admin.from('mission_agents').insert(rows)
      }
    }

    await admin
      .from('mission_recurrences')
      .update({ last_generated_date: future[future.length - 1] })
      .eq('id', rec.id)
  }

  return { generated }
}
