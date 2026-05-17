'use server'

import { createHash, randomBytes } from 'crypto'
import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
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
    .select('id, company_id, role')
    .eq('id', user.id)
    .single()
  if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
    return { ok: false, error: "Seuls les propriétaires et administrateurs peuvent inviter." }
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

  // Envoie l'email avec lien direct vers /accept-invitation/{clearToken}.
  // generateLink renvoie un magic link Supabase qu'on déclenche via inviteUserByEmail.
  const acceptUrl = `${getOrigin()}/auth/callback?next=${encodeURIComponent(`/accept-invitation/${clearToken}`)}`
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: acceptUrl,
    data: {
      invitation_id: invitation.id,
      role: parsed.data.role,
    },
  })
  if (emailError) {
    // Rollback : si l'email a échoué, on garde l'invitation pour pouvoir la renvoyer manuellement.
    return {
      ok: false,
      error: `Invitation créée mais email non envoyé : ${emailError.message}. Tu pourras la renvoyer depuis la liste.`,
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

  // Crée le profile dans la company de l'invitation
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
    return { ok: false, error: `Création du profil échouée : ${profileError.message}` }
  }

  // Marque l'invitation comme acceptée
  await admin
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq('id', invitation.id)

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
  if (error) return { ok: false, error: error.message }

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

/** Lists invitations of the current company (owner/admin only). */
export async function listInvitations(): Promise<InvitationRow[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createServerClient()
  if (!supabase) return []
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
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: "Service role indisponible." }

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
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo: acceptUrl,
    data: { invitation_id: invitationId, role: invitation.role },
  })
  if (emailError) return { ok: false, error: emailError.message }

  revalidatePath('/parametres')
  return { ok: true, message: `Nouvel email envoyé à ${invitation.email}.` }
}
