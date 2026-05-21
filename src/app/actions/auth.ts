'use server'

import * as Sentry from '@sentry/nextjs'
import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { isSchemaCacheError, toUserMessage } from '@/lib/errors/user-message'
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
  | { ok: true; message?: string; email?: string }
  | { ok: false; error: string }

// BUG-008 : trailing slash on NEXT_PUBLIC_APP_URL leaks into the magic-link
// callback as "//auth/callback" — works but isn't clean. Strip it once here.
function getOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return url.replace(/\/+$/, '')
}

// BUG-001 reocurrence : we now Sentry-capture every fatal signup step and
// surface the event id to the user. Support can grep Sentry by the 8-char
// prefix shown in the UI (`réf. support : xxxxxxxx`) and find the exact
// session that failed — instead of asking the user to re-describe the error.
function friendlySignupError(err: unknown, eventId: string | undefined, fallback: string): string {
  const base = toUserMessage(err, fallback)
  if (!eventId) return base
  return `${base} (réf. support : ${eventId.slice(0, 8)})`
}

function captureSignupFailure(err: unknown, step: string, extra: Record<string, unknown>): string {
  return Sentry.captureException(err, {
    tags: {
      action: 'signUpCompany',
      step,
      schema_cache_error: isSchemaCacheError(err) ? 'true' : 'false',
    },
    extra,
  })
}

export async function signInWithMagicLink(formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Email invalide' }
  }

  // Rate-limit : 5 magic-link tentatives / 10 min par email pour éviter le
  // spam (en plus du rate-limit Supabase interne). Empêche aussi un user de
  // crasher accidentellement sa propre boîte mail.
  const email = parsed.data.email.toLowerCase().trim()
  const rl = await rateLimit(`magic-link:${email}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'Trop de tentatives. Réessaie dans quelques minutes.',
    }
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
    email,
    options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
  })

  if (error) {
    console.error('[login] signInWithOtp failed:', error)
    return { ok: false, error: toUserMessage(error, 'Envoi du lien impossible. Réessaie dans quelques instants.') }
  }
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

  const normalizedEmail = parsed.data.email.toLowerCase().trim()

  // Rate-limit : 3 tentatives de création / 1h par email. Parité avec
  // signInWithMagicLink (5/10min) — le signup est plus coûteux côté DB donc
  // on serre la fenêtre. Protège contre signup-spam qui peut faire échouer
  // l'infra et déclencher le message "Service temporairement indisponible".
  const rl = await rateLimit(`signup:${normalizedEmail}`, 3, 60 * 60 * 1000)
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'Trop de tentatives de création de compte. Réessaie dans 1 heure.',
    }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Auth Supabase non configurée. Provisionne d'abord le projet Supabase + les variables d'environnement.",
    }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible (SUPABASE_SERVICE_ROLE_KEY manquante).' }

  // Pre-flight: réjete tout email déjà attaché à un profil existant. Sans ça,
  // createUser ci-dessous échoue avec "User already registered" mais peut
  // laisser un état partiel (auth.users orphelin si profile insert échoue
  // ensuite). On veut un message FR clair à l'utilisateur en amont.
  // listUsers accepte un filter `email.eq.` via une page paginée — ici on
  // ne s'appuie pas dessus (pas exposé dans tous les SDK), donc on regarde
  // côté profiles (notre source de vérité). Si un profil existe déjà avec
  // cet email, le user a déjà un compte (et est associé à une company).
  // .eq() (et pas .ilike()) : les emails sont normalisés en lowercase au
  // stockage, et ilike interprète `_` et `%` comme wildcards SQL — un
  // `john_smith@example.com` matchait n'importe quel `johnXsmith@…`.
  const { data: existingProfile, error: existingErr } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle<{ id: string }>()
  if (existingErr) {
    console.error('[signup] existing profile lookup failed:', existingErr)
    const eventId = captureSignupFailure(existingErr, 'existing_profile_lookup', {
      email: normalizedEmail,
    })
    return {
      ok: false,
      error: friendlySignupError(
        existingErr,
        eventId,
        'Vérification du compte impossible. Réessaie ou contacte le support.',
      ),
    }
  }
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
    if (msg) console.error('[signup] createUser failed:', userError)
    if (/already.*(registered|exists)/i.test(msg)) {
      // Best-effort : renvoie automatiquement un magic link. Le compte existe
      // déjà dans auth.users — ensureProfileForCurrentUser() complétera la
      // setup au prochain hit côté serveur si profiles manque. Pas de
      // régression vie privée : le message disclose déjà l'existence du compte.
      //
      // IMPORTANT : on passe par createServerClient() (SSR + cookies) et non
      // par le client admin, pour la même raison que le primary path en bas
      // de cette fonction — le code_verifier PKCE doit être posé en cookie
      // pour que /auth/callback puisse échanger le code.
      try {
        const supabase = await createServerClient()
        if (supabase) {
          await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
          })
        }
      } catch (err) {
        // Log only — l'utilisateur a toujours le path /login pour redemander.
        console.warn('[signup] auto-resend magic link failed:', err)
      }
      return {
        ok: false,
        error: 'Cette adresse est déjà enregistrée. Vérifie ta boîte de réception — un lien de connexion vient de t\'être renvoyé.',
      }
    }
    const eventId = captureSignupFailure(userError ?? new Error('createUser returned no user'), 'create_user', {
      email: normalizedEmail,
    })
    return {
      ok: false,
      error: friendlySignupError(
        userError,
        eventId,
        'Création du compte impossible. Réessaie ou contacte le support.',
      ),
    }
  }
  const userId = userData.user.id

  // 2. Crée l'entreprise. Si ça plante, on nettoie le auth.user créé juste avant.
  const { data: companyData, error: companyError } = await admin
    .from('companies')
    .insert({ name: parsed.data.company_name })
    .select('id')
    .single()
  if (companyError || !companyData) {
    if (companyError) console.error('[signup] companies insert failed:', companyError)
    const eventId = captureSignupFailure(companyError ?? new Error('companies insert returned no row'), 'companies_insert', {
      userId,
      company_name: parsed.data.company_name,
    })
    try { await admin.auth.admin.deleteUser(userId) } catch (err) {
      // Auth user is now orphaned — the user will hit signUpCompany again and
      // either succeed (deleted in retry) or surface the duplicate-email path.
      // Sentry alert lets ops clean up proactively.
      Sentry.captureException(err, {
        tags: { action: 'signUpCompany.rollback', step: 'delete_auth_user' },
        extra: { userId, reason: 'companies_insert_failed' },
      })
    }
    return {
      ok: false,
      error: friendlySignupError(
        companyError,
        eventId,
        'Création de l\'entreprise impossible. Réessaie ou contacte le support.',
      ),
    }
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
    console.error('[signup] profiles insert failed:', profileError)
    const eventId = captureSignupFailure(profileError, 'profiles_insert', {
      userId,
      companyId: companyData.id,
    })
    try { await admin.from('companies').delete().eq('id', companyData.id) } catch (err) {
      Sentry.captureException(err, {
        tags: { action: 'signUpCompany.rollback', step: 'delete_company' },
        extra: { companyId: companyData.id, userId },
      })
    }
    try { await admin.auth.admin.deleteUser(userId) } catch (err) {
      Sentry.captureException(err, {
        tags: { action: 'signUpCompany.rollback', step: 'delete_auth_user' },
        extra: { userId, reason: 'profile_insert_failed' },
      })
    }
    return {
      ok: false,
      error: friendlySignupError(
        profileError,
        eventId,
        'Création du profil impossible. Réessaie ou contacte le support.',
      ),
    }
  }

  // 4. Initialise les tables d'onboarding. Si l'une échoue, on garde malgré
  // tout le compte (auth.user + profil + company) : la fonction
  // ensureProfileForCurrentUser() agit en filet de sécurité au prochain
  // appel server-action, et le middleware ré-évalue le statut onboarding à
  // chaque requête. Mieux vaut un signup "partiellement initialisé" qu'un
  // rollback complet qui efface un compte valide à cause d'un blip réseau.
  const { error: onboardingError } = await admin
    .from('onboarding_status')
    .upsert(
      {
        company_id: companyData.id,
        step_1_completed_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' },
    )
  if (onboardingError) {
    // Log for ops, but don't fail the signup — onboarding rows are recreated
    // on demand by ensureProfileForCurrentUser() / wizard layout.
    console.error('[signup] onboarding_status insert failed (non-fatal):', onboardingError)
  }

  const { error: pricingSettingsError } = await admin
    .from('company_pricing_settings')
    .upsert({ company_id: companyData.id }, { onConflict: 'company_id' })
  if (pricingSettingsError) {
    console.error('[signup] company_pricing_settings insert failed (non-fatal):', pricingSettingsError)
  }

  // 5. Envoie le magic link pour la première connexion. Le ?next=/onboarding/2
  // amène l'utilisateur directement sur l'étape 2 du wizard après confirmation
  // de l'email. Si ça plante, on garde le compte (réessai possible via /login).
  //
  // IMPORTANT : on utilise createServerClient() (SSR + cookies), PAS le client
  // admin. Le flow PKCE de Supabase génère un `code_verifier` à l'appel de
  // signInWithOtp et l'envoie dans un cookie via l'adapter de @supabase/ssr ;
  // au moment où le user clique le magic link, /auth/callback récupère ce
  // cookie pour échanger le code contre une session. Le client admin (créé via
  // @supabase/supabase-js direct depuis PR #40 pour ne pas hériter de cookies
  // user/anon) n'a PAS d'adapter cookies, donc le verifier vit en mémoire de
  // la server action puis disparaît → exchangeCodeForSession plante avec
  // `otp_expired`. C'est ce qui causait l'erreur "Lien de connexion invalide
  // ou expiré" sur /login pour chaque magic link cliqué.
  const supabase = await createServerClient()
  if (!supabase) {
    return {
      ok: true,
      email: normalizedEmail,
      message: 'Compte créé. Connecte-toi via /login pour recevoir le lien de connexion.',
    }
  }
  const { error: linkError } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: `${getOrigin()}/auth/callback?next=/onboarding/2` },
  })
  if (linkError) {
    return {
      ok: true,
      email: normalizedEmail,
      message: `Compte créé, mais l'envoi du magic link a échoué (${linkError.message}). Connecte-toi via /login pour recevoir un nouveau lien.`,
    }
  }

  return {
    ok: true,
    email: normalizedEmail,
    message: 'Compte créé. Consulte ta boîte de réception pour le lien de connexion.',
  }
}

/**
 * Used by the post-signup confirmation page when the user clicks "Renvoyer
 * le lien". Validates the email and re-issues the magic link without
 * recreating the account. Falls back to signInWithMagicLink semantics so
 * existing rate-limiting still applies.
 */
export async function resendSignupLink(email: string): Promise<ActionResult> {
  const fd = new FormData()
  fd.set('email', email)
  return signInWithMagicLink(fd)
}

export async function signOut() {
  const supabase = await createServerClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/login')
}
