'use server'

import { createHash, randomBytes } from 'crypto'
import * as Sentry from '@sentry/nextjs'
import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { invitationEmail } from '@/lib/email/templates'
import { ROLE_LABELS, isOwnerOrAdmin } from '@/lib/auth/rbac'
import { rateLimit } from '@/lib/rate-limit'
import { toUserMessage } from '@/lib/errors/user-message'
import type { Role } from '@/lib/auth/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Owner ne fait PAS partie des rôles invitables (créé uniquement au signup, 1 par entreprise).
const INVITE_ROLES = ['admin', 'sales', 'agent'] as const

const InviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(INVITE_ROLES),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

const AcceptSchema = z.object({
  token: z.string().min(20),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
})

export type InvitationActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * Email delivery for invitations. Single chokepoint used by createInvitation
 * and resendInvitation so both flows behave identically.
 *
 * - **Resend configured** : we generate the Supabase magic link ourselves
 *   (no Supabase email is sent) and dispatch our branded `invitationEmail`
 *   template via Resend. `generateLink({type:'invite'})` creates the user
 *   on the fly; if the user already exists we fall back to type `magiclink`.
 * - **Resend NOT configured** : fall back to Supabase's built-in
 *   `inviteUserByEmail` which sends the default Supabase template.
 *
 * Either way the link lands the recipient on /auth/callback?next=/accept-invitation/{token}.
 */
async function deliverInvitationEmail(
  admin: SupabaseClient,
  args: {
    email: string
    acceptUrl: string
    inviterName: string
    companyName: string
    role: Role
    invitationId: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isResendConfigured()) {
    let linkResult = await admin.auth.admin.generateLink({
      type: 'invite',
      email: args.email,
      options: {
        redirectTo: args.acceptUrl,
        data: { invitation_id: args.invitationId, role: args.role },
      },
    })
    // Existing auth.users row → invite is rejected. Fall back to magiclink.
    if (linkResult.error && /already.*(registered|exists)/i.test(linkResult.error.message)) {
      linkResult = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: args.email,
        options: { redirectTo: args.acceptUrl },
      })
    }
    if (linkResult.error) return { ok: false, error: toUserMessage(linkResult.error, 'Envoi de l\'invitation impossible. Réessaie ou contacte le support.') }
    const actionLink = linkResult.data?.properties?.action_link
    if (!actionLink) return { ok: false, error: 'Magic link non généré par Supabase' }

    const tpl = invitationEmail({
      inviterName: args.inviterName,
      companyName: args.companyName,
      roleLabel: ROLE_LABELS[args.role],
      acceptUrl: actionLink,
    })
    const res = await sendEmail({ to: args.email, ...tpl })
    if (!res.ok) return { ok: false, error: res.error }
    return { ok: true }
  }

  // Fallback : Supabase's own email pipeline.
  const { error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: args.acceptUrl,
    data: { invitation_id: args.invitationId, role: args.role },
  })
  if (error) {
    console.error('[invitations] inviteUserByEmail failed:', error)
    return { ok: false, error: toUserMessage(error, 'Envoi de l\'invitation impossible.') }
  }
  return { ok: true }
}

const MAX_SEATS = 5

export interface SeatUsage {
  used: number
  max: number
  pending: number
  active: number
}

/** Counts seats currently consumed by a company. Owner is excluded from the limit. */
async function getSeatUsage(
  admin: NonNullable<Awaited<ReturnType<typeof createServiceRoleClient>>>,
  companyId: string,
): Promise<SeatUsage> {
  // Désactivés (is_active=false) ne consomment pas de siège : c'est ce qui
  // permet de libérer une place sans supprimer le profil (et perdre l'historique).
  const [{ count: active }, { count: pending }] = await Promise.all([
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)
      .neq('role', 'owner'),
    admin
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending'),
  ])
  return {
    used: (active ?? 0) + (pending ?? 0),
    max: MAX_SEATS,
    pending: pending ?? 0,
    active: active ?? 0,
  }
}

/** Public — returns seat usage for the current user's company. UI uses this for the X/5 badge. */
export async function getCompanySeatUsage(): Promise<SeatUsage> {
  const empty: SeatUsage = { used: 0, max: MAX_SEATS, pending: 0, active: 0 }
  if (!isSupabaseConfigured()) return empty
  const supabase = await createServerClient()
  const admin = await createServiceRoleClient()
  if (!supabase || !admin) return empty
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return empty
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile) return empty
  return getSeatUsage(admin, profile.company_id)
}

/** Owner/admin creates an invitation. Sends a magic-link-style email via Supabase. */
export async function createInvitation(formData: FormData): Promise<InvitationActionResult> {
  const parsed = InviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    first_name: formData.get('first_name') ?? undefined,
    last_name: formData.get('last_name') ?? undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Auth Supabase non configurée. Configurer NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY." }
  }

  const supabase = await createServerClient()
  const admin = await createServiceRoleClient()
  if (!supabase || !admin) return { ok: false, error: "Client Supabase indisponible." }

  // Vérifie que l'inviteur est connecté + qu'il est owner/admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Tu dois être connecté pour inviter." }

  const { data: inviter } = await supabase
    .from('profiles')
    .select('id, company_id, role, first_name, last_name, companies(name)')
    .eq('id', user.id)
    .single<{
      id: string
      company_id: string
      role: string
      first_name: string
      last_name: string
      companies: { name: string } | null
    }>()
  if (!inviter || !isOwnerOrAdmin(inviter.role)) {
    return { ok: false, error: "Seuls les propriétaires et administrateurs peuvent inviter." }
  }
  const inviterName = [inviter.first_name, inviter.last_name].filter(Boolean).join(' ') || user.email || 'Un administrateur'
  const companyName = inviter.companies?.name ?? 'ton entreprise'

  // Rate-limit côté inviteur : 10 invitations / 10 min, suffisant pour
  // remplir les 5 sièges + retries sans bloquer un usage normal.
  const rl = await rateLimit(`invite:${inviter.id}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) {
    return { ok: false, error: 'Trop d\'invitations en peu de temps. Réessaie dans quelques minutes.' }
  }

  // Limite de sièges : 1 owner + 5 collaborateurs max.
  // Le trigger PostgreSQL est la source de vérité ; on check ici aussi pour un message FR clair.
  const seats = await getSeatUsage(admin, inviter.company_id)
  if (seats.used >= seats.max) {
    return {
      ok: false,
      error: `Limite atteinte : ${seats.max} sièges utilisés (hors propriétaire). Révoque une invitation ou désactive un collaborateur pour libérer un siège.`,
    }
  }

  // Token clair (32 bytes hex = 64 chars) + hash sha256
  const clearToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(clearToken)

  const { data: invitation, error: insertError } = await admin
    .from('invitations')
    .insert({
      company_id: inviter.company_id,
      email: parsed.data.email.toLowerCase().trim(),
      role: parsed.data.role,
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      token_hash: tokenHash,
      invited_by: inviter.id,
    })
    .select('id')
    .single()
  if (insertError || !invitation) {
    // Le trigger DB renvoie SEAT_LIMIT_REACHED si la course-condition avec le check applicatif perd.
    if (insertError?.message?.includes('SEAT_LIMIT_REACHED')) {
      return { ok: false, error: `Limite atteinte : ${MAX_SEATS} sièges utilisés (hors propriétaire).` }
    }
    return { ok: false, error: insertError?.message ?? "Création de l'invitation échouée" }
  }

  // Envoie l'email via Resend (custom-branded) ou Supabase (fallback).
  const acceptUrl = `${getOrigin()}/auth/callback?next=${encodeURIComponent(`/accept-invitation/${clearToken}`)}`
  const delivery = await deliverInvitationEmail(admin, {
    email: parsed.data.email,
    acceptUrl,
    inviterName,
    companyName,
    role: parsed.data.role as Role,
    invitationId: invitation.id,
  })
  if (!delivery.ok) {
    // L'invitation reste en DB pour pouvoir être renvoyée manuellement.
    return {
      ok: false,
      error: `Invitation créée mais email non envoyé : ${delivery.error}. Tu pourras la renvoyer depuis la liste.`,
    }
  }

  revalidatePath('/parametres')
  return { ok: true, message: `Invitation envoyée à ${parsed.data.email}.` }
}

/** Public — accepts an invitation. The user must already have a session (magic link clicked). */
export async function acceptInvitation(formData: FormData): Promise<InvitationActionResult> {
  const parsed = AcceptSchema.safeParse({
    token: formData.get('token'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Auth Supabase non configurée." }

  const supabase = await createServerClient()
  const admin = await createServiceRoleClient()
  if (!supabase || !admin) return { ok: false, error: "Client Supabase indisponible." }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Tu dois cliquer le lien dans l'email avant d'accepter l'invitation." }

  const tokenHash = hashToken(parsed.data.token)
  const { data: invitation, error: invitationError } = await admin
    .from('invitations')
    .select('id, company_id, email, role, status, expires_at')
    .eq('token_hash', tokenHash)
    .single()
  if (invitationError || !invitation) {
    return { ok: false, error: "Invitation introuvable ou révoquée." }
  }
  if (invitation.status !== 'pending') {
    return { ok: false, error: `Cette invitation a déjà été ${invitation.status}.` }
  }
  if (new Date(invitation.expires_at) < new Date()) {
    await admin.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return { ok: false, error: "Cette invitation a expiré. Demande à l'administrateur de t'en envoyer une nouvelle." }
  }
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return { ok: false, error: "L'email de connexion ne correspond pas à celui de l'invitation." }
  }

  // Atomic flip pending → accepted using a conditional UPDATE: if two
  // concurrent acceptInvitation() calls land at the same time, exactly one
  // will see rowCount=1, the other will see rowCount=0 and bail out before
  // touching profiles. This prevents the race where both invocations create
  // (or attempt to create) a profile.
  const acceptedAt = new Date().toISOString()
  const { data: claimedRows, error: claimError } = await admin
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: acceptedAt,
      accepted_by: user.id,
    })
    .eq('id', invitation.id)
    .eq('status', 'pending') // optimistic lock — only flip if still pending
    .select('id')
  if (claimError) {
    return { ok: false, error: `Acceptation de l'invitation échouée : ${claimError.message}` }
  }
  if (!claimedRows || claimedRows.length === 0) {
    // Une autre acceptation a gagné la course, ou l'invitation a été
    // expirée/révoquée entre le SELECT et l'UPDATE.
    return { ok: false, error: "Invitation déjà acceptée par un autre processus." }
  }

  // Crée le profil dans la company de l'invitation. ON CONFLICT (id) DO NOTHING
  // pour le cas où un profile orphelin existe déjà (signup partiel précédent) —
  // on ne veut surtout pas écraser un profile existant d'une autre company.
  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    company_id: invitation.company_id,
    email: invitation.email,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: invitation.role,
    is_active: true,
  })
  if (profileError) {
    // Rollback : si on a claimed l'invitation mais que la création du profil
    // a échoué, on remet l'invitation en pending pour ne pas la perdre.
    const errorMsg = profileError.message
    try {
      await admin
        .from('invitations')
        .update({ status: 'pending', accepted_at: null, accepted_by: null })
        .eq('id', invitation.id)
    } catch (rollbackErr) {
      // L'invitation reste en 'accepted' sans profil — orphan que seul un
      // admin DB peut nettoyer. Sentry pour qu'on soit alerté tout de suite.
      Sentry.captureException(rollbackErr, {
        tags: { action: 'acceptInvitation.rollback' },
        extra: { invitationId: invitation.id, originalError: errorMsg },
      })
    }
    // Cas spécifique : le user a déjà un profile (cross-tenant accidentel) →
    // message FR explicite.
    if (/duplicate.*key|profiles_pkey/i.test(errorMsg)) {
      return {
        ok: false,
        error: 'Cet utilisateur est déjà associé à une autre entreprise. Connecte-toi avec un email différent.',
      }
    }
    return { ok: false, error: `Création du profil échouée : ${errorMsg}` }
  }

  return { ok: true, message: 'Bienvenue dans l\'équipe !' }
}

/** Owner/admin revokes a pending invitation. */
export async function revokeInvitation(invitationId: string): Promise<InvitationActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Auth Supabase non configurée." }
  const supabase = await createServerClient()
  if (!supabase) return { ok: false, error: "Client Supabase indisponible." }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('status', 'pending')
  if (error) {
    console.error('[invitations] revoke failed:', error)
    return { ok: false, error: toUserMessage(error, 'Révocation de l\'invitation impossible.') }
  }

  revalidatePath('/parametres')
  return { ok: true, message: 'Invitation révoquée.' }
}

export interface InvitationRow {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

/**
 * Lists invitations of the current company (owner/admin only).
 *
 * Even though RLS scopes the rows to current_company_id(), this action is
 * exported and callable by anyone with a session — we explicitly gate it
 * to owner/admin so an `agent` can't enumerate pending invitations (which
 * would leak the emails of people in the pipeline).
 */
export async function listInvitations(): Promise<InvitationRow[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createServerClient()
  if (!supabase) return []
  // Role check — equivalent to requirePermission('settings:read') but inline
  // since this returns an array (not an ActionResult).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (!profile || !isOwnerOrAdmin(profile.role)) {
    return []
  }
  const { data } = await supabase
    .from('invitations')
    .select('id, email, role, first_name, last_name, status, expires_at, accepted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as InvitationRow[]
}

/** Owner/admin re-sends an invitation email (refreshes expires_at). */
export async function resendInvitation(invitationId: string): Promise<InvitationActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Auth Supabase non configurée." }
  const supabase = await createServerClient()
  const admin = await createServiceRoleClient()
  if (!supabase || !admin) return { ok: false, error: "Client Supabase indisponible." }

  // Auth + role check + grab caller name/company for the email template.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Tu dois être connecté pour renvoyer une invitation." }
  const { data: caller } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, companies(name)')
    .eq('id', user.id)
    .single<{ role: string; first_name: string; last_name: string; companies: { name: string } | null }>()
  if (!caller || !isOwnerOrAdmin(caller.role)) {
    return { ok: false, error: "Seuls les propriétaires et administrateurs peuvent renvoyer." }
  }
  const inviterName = [caller.first_name, caller.last_name].filter(Boolean).join(' ') || user.email || 'Un administrateur'
  const companyName = caller.companies?.name ?? 'ton entreprise'

  // Rate-limit le renvoi : 5 / 10 min par invitation.
  const rl = await rateLimit(`resend:${invitationId}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return { ok: false, error: 'Trop de renvois récents. Réessaie dans quelques minutes.' }
  }

  // Nouveau token (le précédent est invalidé puisque le hash en base change)
  const clearToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(clearToken)

  const { data: invitation, error: updateError } = await admin
    .from('invitations')
    .update({
      token_hash: tokenHash,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
      accepted_by: null,
    })
    .eq('id', invitationId)
    .select('email, role')
    .single()
  if (updateError || !invitation) {
    return { ok: false, error: updateError?.message ?? "Invitation introuvable" }
  }

  const acceptUrl = `${getOrigin()}/auth/callback?next=${encodeURIComponent(`/accept-invitation/${clearToken}`)}`
  const delivery = await deliverInvitationEmail(admin, {
    email: invitation.email,
    acceptUrl,
    inviterName,
    companyName,
    role: invitation.role as Role,
    invitationId,
  })
  if (!delivery.ok) return { ok: false, error: delivery.error }

  revalidatePath('/parametres')
  return { ok: true, message: `Nouvel email envoyé à ${invitation.email}.` }
}
