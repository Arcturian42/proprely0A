'use server'

import { revalidatePath } from 'next/cache'

import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { roleCan } from '@/lib/auth/rbac'
import type { AppNotification, NotificationKind, NotificationSeverity } from '@/types'
import type { Role } from '@/lib/auth/types'

/**
 * In-app notifications — bell icon + dropdown panel.
 *
 * Two flavors of writer here :
 *  - notifyUser() — called from user-initiated server actions (e.g. an agent
 *    reports an issue → notify managers). The caller is authenticated, RLS
 *    enforces tenant scope via `notifications_insert` policy.
 *  - notifyUserAsSystem() — called from cron/webhook handlers where there's
 *    no session. Uses the service-role client to bypass RLS, but still
 *    passes the explicit company_id to avoid cross-tenant accidents.
 *
 * Readers and the "mark as read" mutation are scoped to the caller's
 * recipient_id by RLS — no extra check needed in app code.
 */

interface NotifyInput {
  companyId: string
  recipientId: string
  kind: NotificationKind
  title: string
  body?: string | null
  severity?: NotificationSeverity
  linkPath?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Insert a notification using the calling user's session. Use this when the
 * action is triggered by a user request (server action chain). Returns the
 * created row on success, `null` on failure (logged, never thrown — we don't
 * want a notification error to abort the parent business action).
 */
export async function notifyUser(input: NotifyInput): Promise<AppNotification | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await createServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      company_id: input.companyId,
      recipient_id: input.recipientId,
      kind: input.kind,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body ?? null,
      link_path: input.linkPath ?? null,
      related_entity_type: input.relatedEntityType ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      metadata: input.metadata ?? null,
    })
    .select()
    .single()

  if (error) {
    // Don't fail the parent action — log + return null so a notification
    // glitch (e.g. RLS misconfig) doesn't break the business flow.
    console.error('[notifications] insert failed', error)
    return null
  }
  return data as AppNotification
}

/**
 * Same as notifyUser but bypasses RLS via service role. Use ONLY from cron
 * jobs / webhooks where there's no authenticated session.
 */
export async function notifyUserAsSystem(input: NotifyInput): Promise<AppNotification | null> {
  if (!isSupabaseConfigured()) return null
  const admin = await createServiceRoleClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('notifications')
    .insert({
      company_id: input.companyId,
      recipient_id: input.recipientId,
      kind: input.kind,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body ?? null,
      link_path: input.linkPath ?? null,
      related_entity_type: input.relatedEntityType ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      metadata: input.metadata ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[notifications] system insert failed', error)
    return null
  }
  return data as AppNotification
}

/**
 * Fan-out helper : notify every user in the company who has the given
 * permission. Used for ops-wide events (e.g. mission issue → all managers).
 * De-dupes by user id so an owner with admin perms gets a single notif.
 *
 * Optionally exclude one user (typically the actor who triggered the event,
 * to avoid self-notifying).
 */
export async function notifyTeamWithPermission(
  companyId: string,
  permission: import('@/lib/auth/types').Permission,
  notif: Omit<NotifyInput, 'companyId' | 'recipientId'>,
  options?: { excludeUserId?: string },
): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const admin = await createServiceRoleClient()
  if (!admin) return 0

  // RLS-bypassed read of profiles in the same company. We need service role
  // because the original server-side caller already has a session, but we
  // want a stable list independent of `auth.uid()` for the recipients.
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, role, is_active')
    .eq('company_id', companyId)

  if (error || !profiles) {
    console.error('[notifications] team lookup failed', error)
    return 0
  }

  const recipients = profiles.filter(p => {
    if (!p.is_active) return false
    if (options?.excludeUserId && p.id === options.excludeUserId) return false
    return roleCan(p.role as Role, permission)
  })

  if (recipients.length === 0) return 0

  const rows = recipients.map(p => ({
    company_id: companyId,
    recipient_id: p.id,
    kind: notif.kind,
    severity: notif.severity ?? 'info',
    title: notif.title,
    body: notif.body ?? null,
    link_path: notif.linkPath ?? null,
    related_entity_type: notif.relatedEntityType ?? null,
    related_entity_id: notif.relatedEntityId ?? null,
    metadata: notif.metadata ?? null,
  }))

  const { error: insertErr } = await admin.from('notifications').insert(rows)
  if (insertErr) {
    console.error('[notifications] team insert failed', insertErr)
    return 0
  }
  return rows.length
}

export interface NotificationListResult {
  unreadCount: number
  items: AppNotification[]
}

const MAX_LIST_ITEMS = 30

/**
 * Pull the bell-icon payload : unread count + most recent N items (incl.
 * already-read ones so the user can scroll back through what they've seen).
 *
 * Returns empty when Supabase isn't configured — bell renders as "no unread"
 * which is the right default in dummy mode.
 */
export async function listNotifications(): Promise<NotificationListResult> {
  if (!isSupabaseConfigured()) return { unreadCount: 0, items: [] }
  const supabase = await createServerClient()
  if (!supabase) return { unreadCount: 0, items: [] }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { unreadCount: 0, items: [] }

  const [{ count }, { data: items }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_LIST_ITEMS),
  ])

  return {
    unreadCount: count ?? 0,
    items: (items as AppNotification[]) ?? [],
  }
}

/**
 * Flip read_at to now() for a single notification. RLS guarantees the
 * caller can only update their own. We don't error if the row is already
 * read — idempotent.
 */
export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) return { ok: true }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)

  if (error) {
    console.error('[notifications] markRead failed', error)
    return { ok: false }
  }
  revalidatePath('/dashboard')
  return { ok: true }
}

/**
 * Mark every unread notification of the current user as read. Used by the
 * "Tout marquer comme lu" action in the bell dropdown.
 */
export async function markAllNotificationsRead(): Promise<{ ok: boolean; count: number }> {
  if (!isSupabaseConfigured()) return { ok: true, count: 0 }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, count: 0 }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, count: 0 }

  const { error, count } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() }, { count: 'exact' })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[notifications] markAllRead failed', error)
    return { ok: false, count: 0 }
  }
  revalidatePath('/dashboard')
  return { ok: true, count: count ?? 0 }
}
