'use server'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { roleCan } from '@/lib/auth/rbac'
import type { Permission, Role } from '@/lib/auth/types'

export type AuthorizedCaller = {
  userId: string
  companyId: string
  role: Role
}

/**
 * Server-side permission gate for server actions.
 *
 * Resolves the current user's profile, checks they hold the given permission
 * per the RBAC matrix, and returns the authorized caller context. Returns
 * `null` and a French error message on failure — callers turn that into
 * their own ActionResult shape.
 *
 * In dummy mode (Supabase unconfigured) we let everything through so the
 * dev experience isn't blocked when there's no real auth backing the UI.
 */
export async function requirePermission(
  permission: Permission,
): Promise<{ ok: true; caller: AuthorizedCaller } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      caller: { userId: 'dummy', companyId: 'dummy', role: 'owner' },
    }
  }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Supabase indisponible' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, is_active')
    .eq('id', user.id)
    .single()
  if (!profile) return { ok: false, error: 'Profil introuvable' }
  if (!profile.is_active) return { ok: false, error: 'Compte désactivé' }

  const role = profile.role as Role
  if (!roleCan(role, permission)) {
    return { ok: false, error: 'Permission refusée pour ton rôle.' }
  }

  return {
    ok: true,
    caller: { userId: user.id, companyId: profile.company_id, role },
  }
}
