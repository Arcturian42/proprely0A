'use server'

import * as Sentry from '@sentry/nextjs'
import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { isSchemaCacheError, toUserMessage } from '@/lib/errors/user-message'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Password : bcrypt limit = 72 bytes. We cap at 72 chars (good enough for the
// vast majority of UTF-8 inputs) so Supabase doesn't silently reject the password
// without an actionable error.
const PasswordSchema = z
  .string()
  .min(6, '6 caractères minimum')
  .max(72, 'Maximum 72 caractères')

const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: PasswordSchema,
})

// confirm_password : on exige min 1 char pour que Zod sorte "Confirmation
// requise" en cas de soumission programmatique sans `required` HTML5. Évite
// aussi le `'foo' === undefined` non-déterministe dans le `.refine()` ci-dessous.
const ConfirmPasswordSchema = z.string().min(1, 'Confirmation requise').max(72)

const SignupSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: PasswordSchema,
    confirm_password: ConfirmPasswordSchema,
    owner_first_name: z.string().min(1, 'Prénom requis').max(100),
    owner_last_name: z.string().min(1, 'Nom requis').max(100),
    company_name: z.string().min(2, "Nom d'entreprise requis").max(200),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Les mots de passe ne correspondent pas',
  })

const ResetRequestSchema = z.object({
  email: z.string().email('Email invalide'),
})

const UpdatePasswordSchema = z
  .object({
    password: PasswordSchema,
    confirm_password: ConfirmPasswordSchema,
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Les mots de passe ne correspondent pas',
  })

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string }

// BUG-008 : trailing slash on NEXT_PUBLIC_APP_URL leaks into the auth callback
// as "//auth/callback" — works but isn't clean. Strip it once here.
//
// Production guard : if NEXT_PUBLIC_APP_URL is missing in prod, the reset /
// signup magic-link callbacks would point to http://localhost:3000 — emails
// would arrive but the link would 404 the user. We log a Sentry warning so
// ops sees it on the first email send, without crashing the request (the
// next() param fallback can still get the user back to /dashboard).
function getOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage('NEXT_PUBLIC_APP_URL missing in production — auth-callback links will point to localhost', {
        level: 'warning',
        tags: { module: 'auth', issue: 'missing-app-url' },
      })
    }
    return 'http://localhost:3000'
  }
  return url.replace(/\/+$/, '')
}

// BUG-001 reocurrence : we Sentry-capture every fatal signup step and surface
// the event id to the user. Support can grep Sentry by the 8-char prefix shown
// in the UI (`réf. support : xxxxxxxx`) and find the exact session that failed.
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

/**
 * Email + password login. Replaces the previous magic-link flow entirely
 * (kept only for accept-invitation which has its own code path via
 * `admin.auth.admin.generateLink('magiclink')` in invitations.ts).
 *
 * Cookies-aware via createServerClient() : the session JWT is posted into the
 * Set-Cookie response header by the SSR adapter, so the next navigation lands
 * on a protected route with an active session.
 */
export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  // Rate-limit : 5 tentatives / 10 min par email pour ralentir une attaque
  // brute-force. Identique à l'ancienne limite magic-link, juste sous une
  // nouvelle clé pour ne pas hériter d'un compteur d'une autre intention.
  const email = parsed.data.email.toLowerCase().trim()
  const rl = await rateLimit(`login:${email}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'Trop de tentatives. Réessaie dans quelques minutes.',
    }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Auth Supabase non configurée. Contacte le support.",
    }
  }

  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Erreur interne (client Supabase indisponible).' }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) {
    console.error('[login] signInWithPassword failed:', error)
    // Supabase returns "Invalid login credentials" for both wrong-password
    // AND no-password-set (legacy magic-link-only users). We can't distinguish
    // server-side, so the FR copy nudges toward "Mot de passe oublié" which
    // also acts as the migration path.
    if (/invalid login credentials|invalid.*email.*password/i.test(error.message)) {
      // Supabase retourne le même "Invalid login credentials" pour
      // "email inconnu", "mauvais mot de passe", et "user existe sans
      // password" (cas des comptes legacy magic-link). On ne peut pas
      // distinguer → message générique qui couvre les 3.
      return {
        ok: false,
        error: 'Email ou mot de passe incorrect. Essaie « Mot de passe oublié » si besoin.',
      }
    }
    return {
      ok: false,
      error: toUserMessage(error, 'Connexion impossible. Réessaie dans quelques instants.'),
    }
  }

  const next = formData.get('next')
  const redirectTo = typeof next === 'string' && next.startsWith('/') ? next : '/dashboard'
  return { ok: true, redirectTo }
}

export async function signUpCompany(formData: FormData): Promise<ActionResult> {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
    owner_first_name: formData.get('owner_first_name'),
    owner_last_name: formData.get('owner_last_name'),
    company_name: formData.get('company_name'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim()

  // Rate-limit : 3 tentatives de création / 1h par email. Le signup est
  // coûteux côté DB et chaque tentative peut laisser des orphelins si une
  // étape échoue au milieu (mitigé par les rollbacks mais autant éviter).
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

  // Pre-flight : rejette tout email déjà attaché à un profil existant. Sans
  // ça, createUser ci-dessous échoue avec "User already registered" mais
  // peut laisser un état partiel (auth.users orphelin si profile insert
  // échoue ensuite).
  // .eq() (et pas .ilike()) : ilike interprète `_` et `%` comme wildcards
  // SQL — un `john_smith@example.com` matchait n'importe quel `johnXsmith@…`.
  const { data: existingProfile, error: existingErr } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle<{ id: string }>()
  if (existingErr) {
    if (isSchemaCacheError(existingErr)) {
      // Schema cache miss (PGRST205) — transient after migrations or cold-start.
      // Skip the pre-flight; createUser handles duplicate emails at step 1.
      console.warn('[signup] pre-flight skipped (schema cache miss):', existingErr)
      Sentry.captureMessage('Signup pre-flight skipped: schema cache miss', {
        level: 'warning',
        tags: { action: 'signUpCompany', step: 'existing_profile_lookup' },
        extra: { email: normalizedEmail, error: existingErr },
      })
    } else {
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
  }
  if (existingProfile) {
    return {
      ok: false,
      error: 'Cette adresse est déjà associée à un compte Proprely. Connecte-toi avec ton mot de passe ou utilise « Mot de passe oublié ».',
    }
  }

  // 1. Crée le compte auth.users AVEC password + email auto-confirmé.
  // email_confirm: true : le user a fourni email+password en même temps. On
  // skip l'étape de confirmation (qui demandait un click email avant) pour
  // permettre un login immédiat sans round-trip PKCE — c'était la racine
  // des bugs des PRs #38-#43. Trade-off : on perd la preuve de propriété de
  // l'email (mais c'était déjà le cas avec l'ancien flow magic link où
  // n'importe quel scanner email pouvait "consommer" le lien).
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.owner_first_name,
      last_name: parsed.data.owner_last_name,
      company_name: parsed.data.company_name,
    },
  })
  if (userError || !userData.user) {
    const msg = userError?.message ?? ''
    if (msg) console.error('[signup] createUser failed:', userError)
    if (/already.*(registered|exists)/i.test(msg)) {
      return {
        ok: false,
        error: 'Cette adresse est déjà enregistrée. Connecte-toi avec ton mot de passe ou utilise « Mot de passe oublié ».',
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

  // 4. Tables d'onboarding (non-fatal — la fonction ensureProfileForCurrentUser
  // les recrée à la demande si besoin).
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
    console.error('[signup] onboarding_status insert failed (non-fatal):', onboardingError)
  }

  const { error: pricingSettingsError } = await admin
    .from('company_pricing_settings')
    .upsert({ company_id: companyData.id }, { onConflict: 'company_id' })
  if (pricingSettingsError) {
    console.error('[signup] company_pricing_settings insert failed (non-fatal):', pricingSettingsError)
  }

  // 5. Établit la session via signInWithPassword sur le client SSR (cookies).
  // C'est ce qui pose le sb-…-auth-token cookie côté browser et permet au
  // user d'atterrir directement sur /onboarding/2 sans passer par /login.
  const supabase = await createServerClient()
  if (!supabase) {
    return {
      ok: true,
      message: 'Compte créé. Connecte-toi via /login.',
      redirectTo: '/login',
    }
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: parsed.data.password,
  })
  if (signInError) {
    // Le compte est créé mais le sign-in auto a foiré — pas critique, l'utilisateur
    // peut se connecter manuellement.
    console.error('[signup] auto sign-in failed (non-fatal):', signInError)
    return {
      ok: true,
      message: 'Compte créé. Connecte-toi avec ton mot de passe.',
      redirectTo: '/login',
    }
  }

  return {
    ok: true,
    redirectTo: '/onboarding/2',
  }
}

/**
 * Envoie un email de réinitialisation. Toujours renvoie ok:true (anti-énumération
 * de comptes) sauf si on est rate-limité — auquel cas le user voit un message
 * neutre l'invitant à attendre.
 *
 * Le lien reset pointe vers /auth/callback?next=/reset-password/update. Le
 * callback échange le code contre une session puis redirige sur la page
 * d'update où le user choisit son nouveau mot de passe.
 */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = ResetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Email invalide' }
  }

  const email = parsed.data.email.toLowerCase().trim()
  const rl = await rateLimit(`password-reset:${email}`, 3, 15 * 60 * 1000)
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'Trop de demandes de réinitialisation. Réessaie dans quelques minutes.',
    }
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Auth Supabase non configurée. Contacte le support.' }
  }

  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Erreur interne (client Supabase indisponible).' }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/reset-password/update`,
  })

  if (error) {
    // On log côté serveur mais on ne fuite pas l'erreur au client — un user
    // mal-intentionné pourrait sinon distinguer "email existe" / "email
    // n'existe pas" via le message d'erreur.
    console.error('[reset-password] resetPasswordForEmail failed:', error)
  }

  return {
    ok: true,
    message: 'Si un compte existe pour cette adresse, un email vient d\'être envoyé.',
  }
}

/**
 * Met à jour le mot de passe de l'utilisateur courant. Appelée depuis
 * /reset-password/update APRÈS que le callback PKCE ait posé une session
 * via le lien reçu par email.
 */
export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = UpdatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Auth Supabase non configurée. Contacte le support.' }
  }

  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: 'Erreur interne (client Supabase indisponible).' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      error: 'Session expirée. Recommence depuis « Mot de passe oublié » sur /login.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    console.error('[update-password] updateUser failed:', error)
    return { ok: false, error: toUserMessage(error, 'Mise à jour du mot de passe impossible. Réessaie.') }
  }

  return { ok: true, redirectTo: '/dashboard' }
}

export async function signOut() {
  const supabase = await createServerClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/login')
}
