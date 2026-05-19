'use server'

import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
  createServerClient,
  createServiceRoleClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import { allRequiredStepsResolved } from '@/lib/onboarding/status'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { invitationEmail } from '@/lib/email/templates'
import { ROLE_LABELS } from '@/lib/auth/rbac'
import { rateLimit } from '@/lib/rate-limit'
import { toUserMessage } from '@/lib/errors/user-message'
import type { OnboardingStatus } from '@/types'

export type OnboardingActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

// ─── Schemas ────────────────────────────────────────────────────────────────

const INVITE_ROLES = ['admin', 'sales', 'agent'] as const

const InviteRowSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(INVITE_ROLES),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

const InviteTeamSchema = z.object({
  invites: z.array(InviteRowSchema).min(1).max(5),
})

const ServiceRowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().default(0),
})

const ServicesSchema = z.object({
  services: z.array(ServiceRowSchema).min(1).max(50),
})

const CalculationUnitEnum = z.enum([
  'm2',
  'linear_meter',
  'hour',
  'flat_rate',
  'room_count',
  'floor_count',
  'workstation_count',
  'weekly_passes',
  'other',
])

const RecurrenceModeEnum = z.enum([
  'per_pass',
  'weekly',
  'monthly',
  'annual_contract',
  'one_shot',
])

const EquipmentModeEnum = z.enum(['included', 'separate_line', 'per_quote_decision'])

const ConsumablesPolicyEnum = z.enum([
  'always_include',
  'never_include',
  'per_quote_decision',
])

const TravelPolicyEnum = z.enum([
  'always_include',
  'never_include',
  'per_quote_decision',
])

const PricingRuleSchema = z.object({
  service_type_id: z.string().uuid(),
  calculation_unit: CalculationUnitEnum,
  calculation_unit_other: z.string().max(100).nullable().optional(),
  base_price_ht: z.number().nonnegative().nullable().optional(),
  estimated_time_minutes: z.number().int().nonnegative().nullable().optional(),
  recommended_agents: z.number().int().min(1).max(50).nullable().optional(),
  consumables_cost: z.number().nonnegative().nullable().optional(),
  equipment_mode: EquipmentModeEnum.nullable().optional(),
  target_margin_pct: z.number().min(0).max(100).nullable().optional(),
  default_vat_rate: z.number().min(0).max(100).nullable().optional(),
  recurrence_mode: RecurrenceModeEnum.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const PricingRulesSchema = z.object({
  rules: z.array(PricingRuleSchema).min(1).max(50),
})

const PricingSettingsSchema = z.object({
  hourly_labor_cost: z.number().nonnegative().nullable().optional(),
  default_target_margin_pct: z.number().min(0).max(100).nullable().optional(),
  default_vat_rate: z.number().min(0).max(100).nullable().optional(),
  consumables_policy: ConsumablesPolicyEnum.optional(),
  travel_policy: TravelPolicyEnum.optional(),
  equipment_mode: EquipmentModeEnum.optional(),
  default_recurrence_mode: RecurrenceModeEnum.optional(),
  meal_allowance_threshold_hours: z.number().min(0).max(24).nullable().optional(),
  meal_allowance_amount: z.number().nonnegative().nullable().optional(),
  machine_rental_daily_cost: z.number().nonnegative().nullable().optional(),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJSONField<T>(raw: FormDataEntryValue | null): T | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function requireOwner(): Promise<
  | { ok: true; companyId: string; userId: string }
  | { ok: false; error: string }
> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (gate.caller.role !== 'owner') {
    return { ok: false, error: "Seul le propriétaire peut compléter l'onboarding." }
  }
  return { ok: true, companyId: gate.caller.companyId, userId: gate.caller.userId }
}

type StepField =
  | 'step_2_team_completed_at'
  | 'step_2_team_skipped_at'
  | 'step_3_services_completed_at'
  | 'step_3_services_skipped_at'
  | 'step_4_pricing_completed_at'
  | 'step_4_pricing_skipped_at'
  | 'step_5_settings_completed_at'
  | 'step_5_settings_skipped_at'

// Returns true if the step is already resolved (completed or skipped). Used
// to make every setX action idempotent — once an owner has validated step
// 3, hitting "Retour" and resubmitting must not duplicate rows.
async function isStepResolved(
  companyId: string,
  completedField: StepField,
  skippedField: StepField,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const admin = await createServiceRoleClient()
  if (!admin) return false
  const { data } = await admin
    .from('onboarding_status')
    .select(`${completedField}, ${skippedField}`)
    .eq('company_id', companyId)
    .maybeSingle<Record<StepField, string | null>>()
  if (!data) return false
  return Boolean(data[completedField] || data[skippedField])
}

async function markOnboardingStep(
  companyId: string,
  field: StepField,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true } // dummy mode no-op
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }
  const { error } = await admin
    .from('onboarding_status')
    .update({ [field]: new Date().toISOString() })
    .eq('company_id', companyId)
  if (error) {
    console.error('[onboarding] mark step failed:', error)
    return { ok: false, error: toUserMessage(error, 'Mise à jour de l\'onboarding impossible.') }
  }
  return { ok: true }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// ─── Step 2 — invite team ───────────────────────────────────────────────────

// Batch-invites up to 5 collaborators (same cap as seat limit minus owner).
// Each invitation goes through the same Supabase invite/Resend pipeline as
// createInvitation, but we keep this server action self-contained so the UI
// can submit a single form. Marks step 2 completed if at least one invite
// succeeds (partial success is acceptable — owner can retry the failures
// later from /parametres).
export async function inviteTeam(formData: FormData): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate

  const payload = parseJSONField<{ invites: unknown }>(formData.get('payload'))
  const parsed = InviteTeamSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Liste d\'invitations invalide.',
    }
  }

  if (await isStepResolved(ownerGate.companyId, 'step_2_team_completed_at', 'step_2_team_skipped_at')) {
    return { ok: false, error: 'Étape déjà complétée. Tu peux inviter de nouveaux collaborateurs depuis les paramètres.' }
  }

  if (!isSupabaseConfigured()) {
    const mark = await markOnboardingStep(ownerGate.companyId, 'step_2_team_completed_at')
    if (!mark.ok) return mark
    return { ok: true, message: 'Mode dummy : invitations simulées.' }
  }

  const admin = await createServiceRoleClient()
  const supabase = await createServerClient()
  if (!admin || !supabase) return { ok: false, error: 'Client Supabase indisponible.' }

  // Rate-limit batch (count comme une seule action multiple, donc 10/10min OK)
  const rl = rateLimit(`invite:${ownerGate.userId}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) {
    return { ok: false, error: 'Trop d\'invitations en peu de temps. Réessaie dans quelques minutes.' }
  }

  // Charge le contexte inviteur pour le template email.
  const { data: inviter } = await supabase
    .from('profiles')
    .select('first_name, last_name, companies(name)')
    .eq('id', ownerGate.userId)
    .single<{
      first_name: string
      last_name: string
      companies: { name: string } | null
    }>()
  const inviterName = inviter
    ? [inviter.first_name, inviter.last_name].filter(Boolean).join(' ')
    : 'Le propriétaire'
  const companyName = inviter?.companies?.name ?? 'ton entreprise'

  const successes: string[] = []
  const failures: { email: string; reason: string }[] = []

  for (const row of parsed.data.invites) {
    const email = row.email.toLowerCase().trim()
    const clearToken = randomBytes(32).toString('hex')
    const tokenHash = hashToken(clearToken)

    const { data: invitation, error: insertError } = await admin
      .from('invitations')
      .insert({
        company_id: ownerGate.companyId,
        email,
        role: row.role,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        token_hash: tokenHash,
        invited_by: ownerGate.userId,
      })
      .select('id')
      .single<{ id: string }>()

    if (insertError || !invitation) {
      failures.push({ email, reason: insertError?.message ?? 'Insertion échouée' })
      continue
    }

    const acceptUrl = `${getOrigin()}/auth/callback?next=${encodeURIComponent(`/accept-invitation/${clearToken}`)}`
    const delivery = await deliverInvitationEmail(admin, {
      email,
      acceptUrl,
      inviterName,
      companyName,
      role: row.role,
      invitationId: invitation.id,
    })
    if (!delivery.ok) {
      // L'invitation est créée mais l'email a échoué : on garde la ligne
      // (l'owner peut la renvoyer depuis /parametres) mais on signale.
      failures.push({ email, reason: `Email non envoyé : ${delivery.error}` })
      continue
    }
    successes.push(email)
  }

  // Étape 2 marquée done si au moins 1 invitation a réussi. Sinon on laisse
  // l'utilisateur retry — la step n'est pas marquée et il restera sur le wizard.
  if (successes.length === 0) {
    return {
      ok: false,
      error: failures.map(f => `${f.email}: ${f.reason}`).join(' | ') || 'Aucune invitation envoyée.',
    }
  }

  const mark = await markOnboardingStep(ownerGate.companyId, 'step_2_team_completed_at')
  if (!mark.ok) return mark

  revalidatePath('/parametres')

  const summary = failures.length
    ? `${successes.length} invitation(s) envoyée(s), ${failures.length} échec(s).`
    : `${successes.length} invitation(s) envoyée(s).`
  return { ok: true, message: summary }
}

async function deliverInvitationEmail(
  admin: NonNullable<Awaited<ReturnType<typeof createServiceRoleClient>>>,
  args: {
    email: string
    acceptUrl: string
    inviterName: string
    companyName: string
    role: 'admin' | 'sales' | 'agent'
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
    if (linkResult.error && /already.*(registered|exists)/i.test(linkResult.error.message)) {
      linkResult = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: args.email,
        options: { redirectTo: args.acceptUrl },
      })
    }
    if (linkResult.error) return { ok: false, error: linkResult.error.message }
    const actionLink = linkResult.data?.properties?.action_link
    if (!actionLink) return { ok: false, error: 'Magic link non généré.' }
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
  const { error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: args.acceptUrl,
    data: { invitation_id: args.invitationId, role: args.role },
  })
  if (error) {
    console.error('[onboarding] inviteUserByEmail failed:', error)
    return { ok: false, error: toUserMessage(error, 'Envoi de l\'invitation impossible.') }
  }
  return { ok: true }
}

export async function skipTeam(): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate
  if (await isStepResolved(ownerGate.companyId, 'step_2_team_completed_at', 'step_2_team_skipped_at')) {
    return { ok: true }
  }
  const mark = await markOnboardingStep(ownerGate.companyId, 'step_2_team_skipped_at')
  if (!mark.ok) return mark
  revalidatePath('/onboarding')
  return { ok: true }
}

// ─── Step 3 — services ──────────────────────────────────────────────────────

// Replaces the company's services with the selected list. is_default flag
// preserves whether the service came from the suggested 11 defaults vs a
// custom entry, so future analytics / seeding can tell them apart.
export async function setServices(formData: FormData): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate

  const payload = parseJSONField<{ services: unknown }>(formData.get('payload'))
  const parsed = ServicesSchema.safeParse(payload)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Liste de prestations invalide.' }
  }

  if (await isStepResolved(ownerGate.companyId, 'step_3_services_completed_at', 'step_3_services_skipped_at')) {
    return { ok: false, error: 'Étape déjà complétée. Tu peux gérer tes prestations depuis les paramètres.' }
  }

  if (!isSupabaseConfigured()) {
    const mark = await markOnboardingStep(ownerGate.companyId, 'step_3_services_completed_at')
    if (!mark.ok) return mark
    return { ok: true, message: 'Mode dummy : prestations simulées.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const rows = parsed.data.services.map((s) => ({
    company_id: ownerGate.companyId,
    name: s.name.trim(),
    description: s.description ?? null,
    is_default: s.is_default ?? false,
    is_active: true,
    sort_order: s.sort_order ?? 0,
    created_by: ownerGate.userId,
  }))

  const { error } = await admin.from('service_types').insert(rows)
  if (error) {
    console.error('[onboarding] service_types insert failed:', error)
    return { ok: false, error: toUserMessage(error, 'Enregistrement des prestations impossible.') }
  }

  const mark = await markOnboardingStep(ownerGate.companyId, 'step_3_services_completed_at')
  if (!mark.ok) return mark

  revalidatePath('/parametres')
  return { ok: true, message: `${rows.length} prestation(s) enregistrée(s).` }
}

export async function skipServices(): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate
  if (await isStepResolved(ownerGate.companyId, 'step_3_services_completed_at', 'step_3_services_skipped_at')) {
    return { ok: true }
  }
  // Skip de l'étape 3 ⇒ skip auto de l'étape 4 (rien à pricer)
  if (isSupabaseConfigured()) {
    const admin = await createServiceRoleClient()
    if (!admin) return { ok: false, error: 'Service role indisponible.' }
    const now = new Date().toISOString()
    const { error } = await admin
      .from('onboarding_status')
      .update({
        step_3_services_skipped_at: now,
        step_4_pricing_skipped_at: now,
      })
      .eq('company_id', ownerGate.companyId)
    if (error) {
      console.error('[onboarding] skipServices update failed:', error)
      return { ok: false, error: toUserMessage(error, 'Marquage de l\'étape impossible.') }
    }
  }
  revalidatePath('/onboarding')
  return { ok: true }
}

// ─── Step 4 — pricing rules per service ─────────────────────────────────────

export async function setPricingRules(formData: FormData): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate

  const payload = parseJSONField<{ rules: unknown }>(formData.get('payload'))
  const parsed = PricingRulesSchema.safeParse(payload)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Règles de tarification invalides.' }
  }

  if (await isStepResolved(ownerGate.companyId, 'step_4_pricing_completed_at', 'step_4_pricing_skipped_at')) {
    return { ok: false, error: 'Étape déjà complétée. Tu peux modifier la tarification depuis les paramètres.' }
  }

  if (!isSupabaseConfigured()) {
    const mark = await markOnboardingStep(ownerGate.companyId, 'step_4_pricing_completed_at')
    if (!mark.ok) return mark
    return { ok: true, message: 'Mode dummy : règles simulées.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  // Garde-fou : si l'étape 3 a été skippée, refuser l'étape 4. Le middleware
  // l'empêche en théorie mais on protège aussi côté serveur.
  const { data: status } = await admin
    .from('onboarding_status')
    .select('step_3_services_skipped_at')
    .eq('company_id', ownerGate.companyId)
    .maybeSingle<Pick<OnboardingStatus, 'step_3_services_skipped_at'>>()
  if (status?.step_3_services_skipped_at) {
    return { ok: false, error: "Étape 3 skippée : aucune prestation à tarifer." }
  }

  // Vérifie que tous les service_type_id appartiennent à la company de l'owner.
  // Empêche un client malicieux de pricer les services d'une autre entreprise.
  const ids = parsed.data.rules.map((r) => r.service_type_id)
  const { data: owned } = await admin
    .from('service_types')
    .select('id')
    .eq('company_id', ownerGate.companyId)
    .in('id', ids)
  const ownedIds = new Set((owned ?? []).map((r) => r.id))
  for (const id of ids) {
    if (!ownedIds.has(id)) {
      return { ok: false, error: `Prestation introuvable : ${id}` }
    }
  }

  const rows = parsed.data.rules.map((r) => ({
    company_id: ownerGate.companyId,
    service_type_id: r.service_type_id,
    calculation_unit: r.calculation_unit,
    calculation_unit_other: r.calculation_unit_other ?? null,
    base_price_ht: r.base_price_ht ?? null,
    estimated_time_minutes: r.estimated_time_minutes ?? null,
    recommended_agents: r.recommended_agents ?? null,
    consumables_cost: r.consumables_cost ?? null,
    equipment_mode: r.equipment_mode ?? null,
    target_margin_pct: r.target_margin_pct ?? null,
    default_vat_rate: r.default_vat_rate ?? null,
    recurrence_mode: r.recurrence_mode ?? null,
    notes: r.notes ?? null,
  }))

  const { error } = await admin
    .from('pricing_rules')
    .upsert(rows, { onConflict: 'company_id,service_type_id' })
  if (error) {
    console.error('[onboarding] pricing_rules upsert failed:', error)
    return { ok: false, error: toUserMessage(error, 'Enregistrement des règles de tarification impossible.') }
  }

  const mark = await markOnboardingStep(ownerGate.companyId, 'step_4_pricing_completed_at')
  if (!mark.ok) return mark

  revalidatePath('/parametres')
  return { ok: true, message: `${rows.length} règle(s) de tarification enregistrée(s).` }
}

export async function skipPricing(): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate
  if (await isStepResolved(ownerGate.companyId, 'step_4_pricing_completed_at', 'step_4_pricing_skipped_at')) {
    return { ok: true }
  }
  const mark = await markOnboardingStep(ownerGate.companyId, 'step_4_pricing_skipped_at')
  if (!mark.ok) return mark
  revalidatePath('/onboarding')
  return { ok: true }
}

// ─── Step 5 — company-wide pricing settings ─────────────────────────────────

export async function setPricingSettings(formData: FormData): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate

  const payload = parseJSONField<Record<string, unknown>>(formData.get('payload'))
  const parsed = PricingSettingsSchema.safeParse(payload ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Paramètres invalides.' }
  }

  if (await isStepResolved(ownerGate.companyId, 'step_5_settings_completed_at', 'step_5_settings_skipped_at')) {
    return { ok: false, error: 'Étape déjà complétée. Tu peux modifier ces paramètres depuis les paramètres.' }
  }

  if (!isSupabaseConfigured()) {
    const mark = await markOnboardingStep(ownerGate.companyId, 'step_5_settings_completed_at')
    if (!mark.ok) return mark
    return { ok: true, message: 'Mode dummy : paramètres simulés.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { error } = await admin
    .from('company_pricing_settings')
    .upsert(
      {
        company_id: ownerGate.companyId,
        hourly_labor_cost: parsed.data.hourly_labor_cost ?? null,
        default_target_margin_pct: parsed.data.default_target_margin_pct ?? null,
        default_vat_rate: parsed.data.default_vat_rate ?? null,
        consumables_policy: parsed.data.consumables_policy ?? 'per_quote_decision',
        travel_policy: parsed.data.travel_policy ?? 'per_quote_decision',
        equipment_mode: parsed.data.equipment_mode ?? 'per_quote_decision',
        default_recurrence_mode: parsed.data.default_recurrence_mode ?? 'per_pass',
        meal_allowance_threshold_hours: parsed.data.meal_allowance_threshold_hours ?? null,
        meal_allowance_amount: parsed.data.meal_allowance_amount ?? null,
        machine_rental_daily_cost: parsed.data.machine_rental_daily_cost ?? null,
      },
      { onConflict: 'company_id' },
    )
  if (error) {
    console.error('[onboarding] company_pricing_settings upsert failed:', error)
    return { ok: false, error: toUserMessage(error, 'Enregistrement des paramètres impossible.') }
  }

  const mark = await markOnboardingStep(ownerGate.companyId, 'step_5_settings_completed_at')
  if (!mark.ok) return mark

  revalidatePath('/parametres')
  return { ok: true }
}

export async function skipSettings(): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate
  if (await isStepResolved(ownerGate.companyId, 'step_5_settings_completed_at', 'step_5_settings_skipped_at')) {
    return { ok: true }
  }
  const mark = await markOnboardingStep(ownerGate.companyId, 'step_5_settings_skipped_at')
  if (!mark.ok) return mark
  revalidatePath('/onboarding')
  return { ok: true }
}

// ─── Step 6 — finalize ──────────────────────────────────────────────────────

export async function completeOnboarding(): Promise<OnboardingActionResult> {
  const ownerGate = await requireOwner()
  if (!ownerGate.ok) return ownerGate

  if (!isSupabaseConfigured()) {
    return { ok: true, message: 'Mode dummy : onboarding terminé.' }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { data: status } = await admin
    .from('onboarding_status')
    .select('*')
    .eq('company_id', ownerGate.companyId)
    .maybeSingle<OnboardingStatus>()

  if (!allRequiredStepsResolved(status)) {
    return {
      ok: false,
      error: "Toutes les étapes doivent être complétées ou explicitement passées avant de terminer.",
    }
  }

  const { error } = await admin
    .from('onboarding_status')
    .update({ completed_at: new Date().toISOString() })
    .eq('company_id', ownerGate.companyId)
  if (error) {
    console.error('[onboarding] completeOnboarding update failed:', error)
    return { ok: false, error: toUserMessage(error, 'Finalisation de l\'onboarding impossible.') }
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
  return { ok: true }
}

// ─── Read helper for the wizard pages ───────────────────────────────────────

export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  if (!isSupabaseConfigured()) return null
  const gate = await requirePermission('company:write')
  if (!gate.ok) return null
  const admin = await createServiceRoleClient()
  if (!admin) return null
  const { data } = await admin
    .from('onboarding_status')
    .select('*')
    .eq('company_id', gate.caller.companyId)
    .maybeSingle<OnboardingStatus>()
  return data
}

export async function getCompanyServices(): Promise<{ id: string; name: string; is_default: boolean }[]> {
  if (!isSupabaseConfigured()) return []
  const gate = await requirePermission('company:write')
  if (!gate.ok) return []
  const admin = await createServiceRoleClient()
  if (!admin) return []
  const { data } = await admin
    .from('service_types')
    .select('id, name, is_default')
    .eq('company_id', gate.caller.companyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return data ?? []
}
