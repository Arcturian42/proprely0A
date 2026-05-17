'use server'

import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email("Email invalide"),
})

const SignupSchema = z.object({
  email: z.string().email("Email invalide"),
  owner_first_name: z.string().min(1, "Prénom requis").max(100),
  owner_last_name: z.string().min(1, "Nom requis").max(100),
  company_name: z.string().min(2, "Nom d'entreprise requis").max(200),
})

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export async function signInWithMagicLink(formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Email invalide' }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Auth Supabase non configurée (variables d'environnement manquantes). En dev, utilise le CompanySwitcher en haut à droite.",
    }
  }

  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Erreur interne (client Supabase indisponible).' }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: 'Email envoyé. Consulte ta boîte de réception (et les indésirables) pour finaliser la connexion.' }
}

export async function signUpCompany(formData: FormData): Promise<ActionResult> {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    owner_first_name: formData.get('owner_first_name'),
    owner_last_name: formData.get('owner_last_name'),
    company_name: formData.get('company_name'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Auth Supabase non configurée. Provisionne d'abord le projet Supabase + les variables d'environnement.",
    }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible (SUPABASE_SERVICE_ROLE_KEY manquante).' }

  // 1. Crée le compte auth.users (sans email confirmé — magic link s'en charge)
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: false,
    user_metadata: {
      first_name: parsed.data.owner_first_name,
      last_name: parsed.data.owner_last_name,
      company_name: parsed.data.company_name,
    },
  })
  if (userError || !userData.user) {
    return { ok: false, error: userError?.message ?? 'Création du compte échouée' }
  }

  // 2. Crée l'entreprise + le profil owner
  const { data: companyData, error: companyError } = await admin
    .from('companies')
    .insert({ name: parsed.data.company_name })
    .select('id')
    .single()
  if (companyError || !companyData) {
    await admin.auth.admin.deleteUser(userData.user.id)
    return { ok: false, error: companyError?.message ?? 'Création de l\'entreprise échouée' }
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: userData.user.id,
      company_id: companyData.id,
      first_name: parsed.data.owner_first_name,
      last_name: parsed.data.owner_last_name,
      role: 'owner',
      status: 'active',
    })
  if (profileError) {
    await admin.from('companies').delete().eq('id', companyData.id)
    await admin.auth.admin.deleteUser(userData.user.id)
    return { ok: false, error: profileError.message }
  }

  // 3. Envoie le magic link pour la première connexion
  const { error: linkError } = await admin.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
  })
  if (linkError) return { ok: false, error: linkError.message }

  return { ok: true, message: 'Compte créé. Consulte ta boîte de réception pour le lien de connexion.' }
}

export async function signOut() {
  const supabase = await createServerClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/login')
}
