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

  const normalizedEmail = parsed.data.email.toLowerCase().trim()

  // Pre-flight: réjete tout email déjà attaché à un profil existant. Sans ça,
  // createUser ci-dessous échoue avec "User already registered" mais peut
  // laisser un état partiel (auth.users orphelin si profile insert échoue
  // ensuite). On veut un message FR clair à l'utilisateur en amont.
  // listUsers accepte un filter `email.eq.` via une page paginée — ici on
  // ne s'appuie pas dessus (pas exposé dans tous les SDK), donc on regarde
  // côté profiles (notre source de vérité). Si un profil existe déjà avec
  // cet email, le user a déjà un compte (et est associé à une company).
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle<{ id: string }>()
  if (existingProfile) {
    return {
      ok: false,
      error: 'Cette adresse est déjà associée à un compte Proprely. Connecte-toi avec le magic link via /login.',
    }
  }

  // 1. Crée le compte auth.users (sans email confirmé — magic link s'en charge)
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    user_metadata: {
      first_name: parsed.data.owner_first_name,
      last_name: parsed.data.owner_last_name,
      company_name: parsed.data.company_name,
    },
  })
  if (userError || !userData.user) {
    // Cas typique : email présent dans auth.users mais pas dans profiles
    // (un signup précédent a foiré au milieu). On signale clairement plutôt
    // que de laisser l'erreur Supabase opaque atteindre l'utilisateur.
    const msg = userError?.message ?? ''
    if (/already.*(registered|exists)/i.test(msg)) {
      return {
        ok: false,
        error: 'Cette adresse est déjà enregistrée auprès du fournisseur d\'auth. Contacte le support pour réconcilier ton compte.',
      }
    }
    return { ok: false, error: msg || 'Création du compte échouée' }
  }
  const userId = userData.user.id

  // 2. Crée l'entreprise. Si ça plante, on nettoie le auth.user créé juste avant.
  const { data: companyData, error: companyError } = await admin
    .from('companies')
    .insert({ name: parsed.data.company_name })
    .select('id')
    .single()
  if (companyError || !companyData) {
    try { await admin.auth.admin.deleteUser(userId) } catch { /* best-effort */ }
    return { ok: false, error: companyError?.message ?? 'Création de l\'entreprise échouée' }
  }

  // 3. Crée le profil owner. Si ça plante, on nettoie company + user.
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: userId,
      company_id: companyData.id,
      email: normalizedEmail,
      first_name: parsed.data.owner_first_name,
      last_name: parsed.data.owner_last_name,
      role: 'owner',
      is_active: true,
    })
  if (profileError) {
    try { await admin.from('companies').delete().eq('id', companyData.id) } catch { /* best-effort */ }
    try { await admin.auth.admin.deleteUser(userId) } catch { /* best-effort */ }
    return { ok: false, error: profileError.message }
  }

  // 4. Envoie le magic link pour la première connexion. Si ça plante,
  // l'utilisateur peut retry via /login — le compte est bien créé. On retourne
  // OK pour ne pas inutilement detruire le compte qui marche.
  const { error: linkError } = await admin.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
  })
  if (linkError) {
    return {
      ok: true,
      message: `Compte créé, mais l'envoi du magic link a échoué (${linkError.message}). Connecte-toi via /login pour recevoir un nouveau lien.`,
    }
  }

  return { ok: true, message: 'Compte créé. Consulte ta boîte de réception pour le lien de connexion.' }
}

export async function signOut() {
  const supabase = await createServerClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/login')
}
