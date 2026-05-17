'use server'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'

export interface AuditLogRow {
  id: string
  actor_id: string | null
  actor_name: string | null
  entity_type: string
  entity_id: string
  action: 'insert' | 'update' | 'delete'
  created_at: string
}

/**
 * Returns the last N audit log entries for the current company.
 * Owner/admin only — gated by requirePermission('settings:read') so a
 * regular member can't peek at admin activity.
 */
export async function listAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  if (!isSupabaseConfigured()) return []
  const guard = await requirePermission('settings:read')
  if (!guard.ok) return []
  // Extra layer: only owner/admin (settings:read is also granted to sales).
  if (guard.caller.role !== 'owner' && guard.caller.role !== 'admin') return []

  const supabase = await createServerClient()
  if (!supabase) return []

  const { data } = await supabase
    .from('audit_logs')
    .select('id, actor_id, entity_type, entity_id, action, created_at, profiles!audit_logs_actor_id_fkey(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 500))

  // PostgREST returns the joined `profiles` row as an array of one when going
  // through a FK reference. Normalize via Array.isArray below.
  type RawRow = {
    id: string
    actor_id: string | null
    entity_type: string
    entity_id: string
    action: 'insert' | 'update' | 'delete'
    created_at: string
    profiles: { first_name: string; last_name: string }[] | { first_name: string; last_name: string } | null
  }

  return ((data ?? []) as unknown as RawRow[]).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      actor_id: row.actor_id,
      actor_name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        : null,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      created_at: row.created_at,
    }
  })
}
