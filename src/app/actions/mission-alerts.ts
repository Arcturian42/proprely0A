'use server'

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { missionReminderEmail, missionLateAlertEmail } from '@/lib/email/templates'
import { timeToMinutes } from '@/lib/scheduling/overlap'

const LATE_THRESHOLD_MINUTES = 15

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function tomorrow(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface MissionRow {
  id: string
  company_id: string
  scheduled_date: string
  start_time: string | null
  planned_hours: number | null
  status: string | null
  client_id: string | null
  site_id: string | null
}

interface AgentRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface ClientRow {
  id: string
  name: string | null
}

interface SiteRow {
  id: string
  name: string | null
}

interface OwnerRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  company_id: string
}

/**
 * Sends "mission tomorrow" reminders to assigned agents. Idempotent per
 * mission via reminder_sent_at flag — re-running same day is a no-op.
 * Returns counts for observability.
 */
export async function tickMissionReminders(): Promise<{ remindersSent: number }> {
  if (!isSupabaseConfigured()) return { remindersSent: 0 }
  if (!isResendConfigured()) return { remindersSent: 0 }
  const admin = await createServiceRoleClient()
  if (!admin) return { remindersSent: 0 }

  const targetDate = tomorrow()

  // Fetch all missions tomorrow that haven't been reminded yet
  const { data: missions } = await admin
    .from('missions')
    .select('id, company_id, scheduled_date, start_time, planned_hours, status, client_id, site_id')
    .eq('scheduled_date', targetDate)
    .is('reminder_sent_at', null)
    .returns<MissionRow[]>()

  if (!missions || missions.length === 0) return { remindersSent: 0 }

  // Batch fetch related data
  const missionIds = missions.map((m) => m.id)
  const clientIds = [...new Set(missions.map((m) => m.client_id).filter(Boolean) as string[])]
  const siteIds = [...new Set(missions.map((m) => m.site_id).filter(Boolean) as string[])]

  const [{ data: assignments }, { data: clients }, { data: sites }] = await Promise.all([
    admin
      .from('mission_agents')
      .select('mission_id, agent:agents(id, first_name, last_name, email)')
      .in('mission_id', missionIds),
    clientIds.length
      ? admin.from('clients').select('id, name').in('id', clientIds).returns<ClientRow[]>()
      : Promise.resolve({ data: [] as ClientRow[] }),
    siteIds.length
      ? admin.from('sites').select('id, name').in('id', siteIds).returns<SiteRow[]>()
      : Promise.resolve({ data: [] as SiteRow[] }),
  ])

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]))
  const siteMap = new Map((sites ?? []).map((s) => [s.id, s.name]))

  type AssignmentRow = {
    mission_id: string
    agent: AgentRow | AgentRow[] | null
  }
  const agentsByMission = new Map<string, AgentRow[]>()
  for (const row of (assignments ?? []) as AssignmentRow[]) {
    const list = agentsByMission.get(row.mission_id) ?? []
    const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent
    if (agent && agent.email) list.push(agent)
    agentsByMission.set(row.mission_id, list)
  }

  // Flatten the (mission × agent) pairs into a single list of sends we can
  // run in parallel. Without this the cron was O(missions × agents) sequential
  // awaits — a single Resend hiccup compounded across every mission.
  type ReminderSend = {
    missionId: string
    email: string
    tpl: ReturnType<typeof missionReminderEmail>
  }
  const sends: ReminderSend[] = []
  for (const mission of missions) {
    const agents = agentsByMission.get(mission.id) ?? []
    if (agents.length === 0) continue
    const clientName = clientMap.get(mission.client_id ?? '') ?? 'Client'
    const siteName = siteMap.get(mission.site_id ?? '') ?? null

    for (const agent of agents) {
      if (!agent.email) continue
      sends.push({
        missionId: mission.id,
        email: agent.email,
        tpl: missionReminderEmail({
          agentFirstName: agent.first_name ?? '',
          clientName,
          siteName,
          scheduledDate: mission.scheduled_date,
          startTime: mission.start_time,
          plannedHours: mission.planned_hours ?? 0,
          appUrl: getAppUrl(),
        }),
      })
    }
  }

  // Resend's free tier caps at ~10 rps. We send in chunks to stay well under
  // any plausible quota and keep cron latency bounded even with hundreds of
  // missions queued up.
  const CHUNK = 25
  let remindersSent = 0
  for (let i = 0; i < sends.length; i += CHUNK) {
    const chunk = sends.slice(i, i + CHUNK)
    const results = await Promise.all(
      chunk.map(s => sendEmail({ to: s.email, ...s.tpl })),
    )
    remindersSent += results.filter(r => r.ok).length
  }

  // Stamp every mission we actually had agents to remind, regardless of
  // per-email success. The flag is idempotency, not delivery proof — operators
  // see partial sends in Sentry / Resend dashboard.
  const stampMissions = [...new Set(sends.map(s => s.missionId))]
  if (stampMissions.length > 0) {
    await admin
      .from('missions')
      .update({ reminder_sent_at: new Date().toISOString() })
      .in('id', stampMissions)
  }

  return { remindersSent }
}

/**
 * Sends "mission late" alerts to the company owner when a planned mission
 * is past start_time by LATE_THRESHOLD_MINUTES and still not running.
 * Idempotent per mission via late_alert_sent_at.
 */
export async function tickMissionLateAlerts(): Promise<{ alertsSent: number }> {
  if (!isSupabaseConfigured()) return { alertsSent: 0 }
  if (!isResendConfigured()) return { alertsSent: 0 }
  const admin = await createServiceRoleClient()
  if (!admin) return { alertsSent: 0 }

  const now = new Date()
  const cutoffMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - LATE_THRESHOLD_MINUTES
  const dateStr = today()

  const { data: missions } = await admin
    .from('missions')
    .select('id, company_id, scheduled_date, start_time, planned_hours, status, client_id, site_id')
    .eq('scheduled_date', dateStr)
    .is('late_alert_sent_at', null)
    .in('status', ['prevue', 'assigned', 'pending'])
    .returns<MissionRow[]>()

  if (!missions || missions.length === 0) return { alertsSent: 0 }

  // Filter to those past their start_time + threshold (couldn't do this in
  // SQL without a time comparison helper, easier in JS)
  const lateMissions = missions.filter((m) => {
    if (!m.start_time) return false
    return timeToMinutes(m.start_time) <= cutoffMinutes
  })
  if (lateMissions.length === 0) return { alertsSent: 0 }

  const missionIds = lateMissions.map((m) => m.id)
  const companyIds = [...new Set(lateMissions.map((m) => m.company_id))]
  const clientIds = [...new Set(lateMissions.map((m) => m.client_id).filter(Boolean) as string[])]
  const siteIds = [...new Set(lateMissions.map((m) => m.site_id).filter(Boolean) as string[])]

  const [{ data: owners }, { data: assignments }, { data: clients }, { data: sites }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, first_name, last_name, email, company_id')
        .in('company_id', companyIds)
        .eq('role', 'owner')
        .returns<OwnerRow[]>(),
      admin
        .from('mission_agents')
        .select('mission_id, agent:agents(first_name, last_name)')
        .in('mission_id', missionIds),
      clientIds.length
        ? admin.from('clients').select('id, name').in('id', clientIds).returns<ClientRow[]>()
        : Promise.resolve({ data: [] as ClientRow[] }),
      siteIds.length
        ? admin.from('sites').select('id, name').in('id', siteIds).returns<SiteRow[]>()
        : Promise.resolve({ data: [] as SiteRow[] }),
    ])

  const ownerByCompany = new Map((owners ?? []).map((o) => [o.company_id, o]))
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]))
  const siteMap = new Map((sites ?? []).map((s) => [s.id, s.name]))

  type AssignmentRow = {
    mission_id: string
    agent: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
  }
  const agentsByMission = new Map<string, string[]>()
  for (const row of (assignments ?? []) as AssignmentRow[]) {
    const list = agentsByMission.get(row.mission_id) ?? []
    const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent
    if (agent) {
      const name = [agent.first_name, agent.last_name].filter(Boolean).join(' ')
      if (name) list.push(name)
    }
    agentsByMission.set(row.mission_id, list)
  }

  // Build the send plan first, then fan out in parallel. Same shape as
  // tickMissionReminders — fixes the per-mission sequential await that was
  // capping cron throughput regardless of Resend latency.
  type AlertSend = {
    missionId: string
    email: string
    tpl: ReturnType<typeof missionLateAlertEmail>
  }
  const sends: AlertSend[] = []
  for (const mission of lateMissions) {
    const owner = ownerByCompany.get(mission.company_id)
    if (!owner?.email || !mission.start_time) continue
    const delayMinutes = cutoffMinutes - timeToMinutes(mission.start_time) + LATE_THRESHOLD_MINUTES
    sends.push({
      missionId: mission.id,
      email: owner.email,
      tpl: missionLateAlertEmail({
        managerFirstName: owner.first_name ?? '',
        clientName: clientMap.get(mission.client_id ?? '') ?? 'Client',
        siteName: siteMap.get(mission.site_id ?? '') ?? null,
        scheduledDate: mission.scheduled_date,
        startTime: mission.start_time.slice(0, 5),
        agentNames: agentsByMission.get(mission.id) ?? [],
        delayMinutes,
        appUrl: getAppUrl(),
      }),
    })
  }

  const CHUNK = 25
  const stampMissions: string[] = []
  let alertsSent = 0
  for (let i = 0; i < sends.length; i += CHUNK) {
    const chunk = sends.slice(i, i + CHUNK)
    const results = await Promise.all(
      chunk.map(s => sendEmail({ to: s.email, ...s.tpl })),
    )
    results.forEach((r, idx) => {
      if (r.ok) {
        alertsSent += 1
        stampMissions.push(chunk[idx].missionId)
      }
    })
  }

  if (stampMissions.length > 0) {
    await admin
      .from('missions')
      .update({ late_alert_sent_at: new Date().toISOString() })
      .in('id', stampMissions)
  }

  return { alertsSent }
}
