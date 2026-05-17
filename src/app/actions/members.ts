'use server'

import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ASSIGNABLE_ROLES = ['admin', 'sales', 'agent'] as const
const SetRoleSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(ASSIGNABLE_ROLES),
})

export interface MemberRow {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'owner' | 'admin' | 'sales' | 'agent'
  is_active: boolean
  created_at: string
  is_self: boolean
}

export type MemberActionResult = { ok: true; message?: string } | { ok: false; error: string }

/** Resolve the current user's company + role in one trip. */
async function resolveCaller() {
  if (!isSupabaseConfigured()) return null
  const supabase = await createServerClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  return { user, profile, supabase }
}

/** Lists members of the current user's company. Owner row is included. */
export async function listCompanyMembers(): Promise<MemberRow[]> {
  const caller = await resolveCaller()
  if (!caller) return []
  const { data, error } = await caller.supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, is_active, created_at')
    .eq('company_id', caller.profile.company_id)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role as MemberRow['role'],
    is_active: row.is_active,
    created_at: row.created_at,
    is_self: row.id === caller.user.id,
  }))
}

/**
 * Owner/admin toggle a member's active flag. Deactivating frees a seat (the
 * seat counter only counts is_active=true profiles).
 *
 * Rules:
 * - Only owner/admin can call this.
 * - Owner row can never be deactivated (would orphan the company).
 * - Reactivating fails if the company is already at max seats.
 * - Admins can't deactivate other admins (only owner can).
 */
export async function setMemberActive(profileId: string, active: boolean): Promise<MemberActionResult> {
  const caller = await resolveCaller()
  if (!caller) return { ok: false, error: 'Non authentifié' }
  if (caller.profile.role !== 'owner' && caller.profile.role !== 'admin') {
    return { ok: false, error: 'Seuls les propriétaires et administrateurs peuvent gérer les membres.' }
  }
  if (profileId === caller.user.id) {
    return { ok: false, error: 'Tu ne peux pas désactiver ton propre compte.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { data: target } = await admin
    .from('profiles')
    .select('id, company_id, role, is_active')
    .eq('id', profileId)
    .single()
  if (!target || target.company_id !== caller.profile.company_id) {
    return { ok: false, error: 'Membre introuvable.' }
  }
  if (target.role === 'owner') {
    return { ok: false, error: 'Le propriétaire ne peut pas être désactivé.' }
  }
  if (caller.profile.role === 'admin' && target.role === 'admin') {
    return { ok: false, error: 'Seul le propriétaire peut désactiver un autre administrateur.' }
  }

  // Réactivation : check qu'on a un siège libre (cohérent avec le trigger SQL).
  if (active && !target.is_active) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', caller.profile.company_id)
      .eq('is_active', true)
      .neq('role', 'owner')
    const { count: pending } = await admin
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', caller.profile.company_id)
      .eq('status', 'pending')
    if ((count ?? 0) + (pending ?? 0) >= 5) {
      return { ok: false, error: 'Limite de 5 sièges atteinte. Révoque une invitation ou désactive un autre membre d\'abord.' }
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_active: active })
    .eq('id', profileId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true, message: active ? 'Membre réactivé.' : 'Membre désactivé — son siège est libéré.' }
}

/**
 * Owner-only role change. Owner role is immutable (must be transferred via a
 * separate dedicated flow, out of scope for now).
 */
export async function setMemberRole(formData: FormData): Promise<MemberActionResult> {
  const parsed = SetRoleSchema.safeParse({
    profile_id: formData.get('profile_id'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  const caller = await resolveCaller()
  if (!caller) return { ok: false, error: 'Non authentifié' }
  if (caller.profile.role !== 'owner') {
    return { ok: false, error: 'Seul le propriétaire peut modifier les rôles.' }
  }
  if (parsed.data.profile_id === caller.user.id) {
    return { ok: false, error: 'Tu ne peux pas modifier ton propre rôle.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { data: target } = await admin
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', parsed.data.profile_id)
    .single()
  if (!target || target.company_id !== caller.profile.company_id) {
    return { ok: false, error: 'Membre introuvable.' }
  }
  if (target.role === 'owner') {
    return { ok: false, error: 'Le rôle propriétaire ne peut pas être modifié ici.' }
  }

  const { error } = await admin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.profile_id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true, message: 'Rôle mis à jour.' }
}
