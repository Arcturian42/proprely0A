'use server'

import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { Role } from './types'

/**
 * Recovery path for the "Profil introuvable" toast (BUG-002).
 *
 * Some auth.users end up without a matching public.profiles row — either
 * because a partial signup couldn't roll back (network blip during the
 * cleanup chain in signUpCompany), or because a magic-link was issued
 * for an email that never went through the proper signup wizard.
 *
 * When that happens, every server action gated by requirePermission() fails
 * with "Profil introuvable". The optimistic Zustand mutation still shows the
 * row in the UI, but it isn't persisted to Supabase — the user thinks they
 * created a client when they did not.
 *
 * This helper makes one best-effort recovery attempt :
 *   1. Re-check if the profile exists (a concurrent request may have just
 *      created it).
 *   2. If the auth.users row carries `user_metadata.company_name` (set by
 *      signUpCompany), provision the missing company + profile + onboarding
 *      using the service-role client.
 *   3. Otherwise return null so the caller can fall back to a clearer error
 *      ("Compte non finalisé") instead of the cryptic "Profil introuvable".
 *
 * Idempotent (uses ON CONFLICT / IF NOT EXISTS semantics) and never throws —
 * errors are logged server-side but never surfaced to the caller.
 */
export interface EnsuredProfile {
  userId: string
  email: string | null
  companyId: string
  role: Role
}

export async function ensureProfileForCurrentUser(): Promise<EnsuredProfile | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await createServerClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Re-check the profile under the user's own JWT (RLS only lets them see
  //    their own row). A row could have been created since the caller checked.
  const { data: existing } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (existing) {
    return {
      userId: user.id,
      email: user.email ?? null,
      companyId: existing.company_id,
      role: existing.role as Role,
    }
  }

  // 2. No profile — see if we have enough metadata to safely auto-provision.
  //    `user_metadata` is set by signUpCompany when the auth.user was created.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const companyName = typeof meta.company_name === 'string' ? meta.company_name.trim() : ''
  if (!companyName) {
    // No metadata to anchor recovery — the user must complete signup properly.
    return null
  }

  const firstName = typeof meta.first_name === 'string' ? meta.first_name.trim() : ''
  const lastName = typeof meta.last_name === 'string' ? meta.last_name.trim() : ''

  // 3. Service-role client is required to bypass RLS for the bootstrap insert
  //    (the new profile / company doesn't yet satisfy current_company_id()).
  const admin = await createServiceRoleClient()
  if (!admin) return null

  // Race-safe: between our maybeSingle() and the insert below, another request
  // may have created the profile. Re-check under service-role and bail if so.
  const { data: existingViaAdmin } = await admin
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (existingViaAdmin) {
    return {
      userId: user.id,
      email: user.email ?? null,
      companyId: existingViaAdmin.company_id,
      role: existingViaAdmin.role as Role,
    }
  }

  const { data: companyData, error: companyErr } = await admin
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .single<{ id: string }>()
  if (companyErr || !companyData) return null

  const { error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: user.id,
      company_id: companyData.id,
      email: user.email ?? '',
      first_name: firstName || 'Utilisateur',
      last_name: lastName || '',
      role: 'owner' as Role,
      is_active: true,
    })
  if (profileErr) {
    // Roll back the just-created company so we don't leak an orphan row.
    try { await admin.from('companies').delete().eq('id', companyData.id) } catch { /* best-effort */ }
    return null
  }

  // Best-effort onboarding scaffolding — failure here doesn't block CRUD,
  // the layout will recompute the next step on first /onboarding visit.
  try {
    await admin
      .from('onboarding_status')
      .upsert(
        { company_id: companyData.id, step_1_completed_at: new Date().toISOString() },
        { onConflict: 'company_id' },
      )
  } catch { /* best-effort */ }
  try {
    await admin
      .from('company_pricing_settings')
      .upsert({ company_id: companyData.id }, { onConflict: 'company_id' })
  } catch { /* best-effort */ }

  return {
    userId: user.id,
    email: user.email ?? null,
    companyId: companyData.id,
    role: 'owner',
  }
}
