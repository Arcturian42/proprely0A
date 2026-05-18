'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import type {
  PricingRule,
  CompanyPricingSettings,
  ServiceType,
} from '@/types'

export type SettingsActionResult<T = void> =
  | (T extends void ? { ok: true; message?: string } : { ok: true; data: T; message?: string })
  | { ok: false; error: string }

// ─── Schemas (re-declared here so settings can evolve independently of
// the onboarding wizard schemas) ─────────────────────────────────────────────

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

const ServiceTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

function parseJSONField<T>(raw: FormDataEntryValue | null): T | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function loadPricingSettings(): Promise<
  SettingsActionResult<{
    settings: CompanyPricingSettings | null
    services: ServiceType[]
    rules: PricingRule[]
  }>
> {
  const gate = await requirePermission('settings:read')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!isSupabaseConfigured()) {
    return { ok: true, data: { settings: null, services: [], rules: [] } }
  }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const [{ data: settings }, { data: services }, { data: rules }] = await Promise.all([
    admin
      .from('company_pricing_settings')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .maybeSingle<CompanyPricingSettings>(),
    admin
      .from('service_types')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    admin
      .from('pricing_rules')
      .select('*')
      .eq('company_id', gate.caller.companyId),
  ])

  return {
    ok: true,
    data: {
      settings: settings ?? null,
      services: (services ?? []) as ServiceType[],
      rules: (rules ?? []) as PricingRule[],
    },
  }
}

// ─── Write ─────────────────────────────────────────────────────────────────

export async function updatePricingSettings(
  formData: FormData,
): Promise<SettingsActionResult> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  const payload = parseJSONField<Record<string, unknown>>(formData.get('payload'))
  const parsed = PricingSettingsSchema.safeParse(payload ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Paramètres invalides.' }
  }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { error } = await admin
    .from('company_pricing_settings')
    .upsert(
      {
        company_id: gate.caller.companyId,
        hourly_labor_cost: parsed.data.hourly_labor_cost ?? null,
        default_target_margin_pct: parsed.data.default_target_margin_pct ?? null,
        default_vat_rate: parsed.data.default_vat_rate ?? null,
        consumables_policy: parsed.data.consumables_policy ?? 'per_quote_decision',
        travel_policy: parsed.data.travel_policy ?? 'per_quote_decision',
        equipment_mode: parsed.data.equipment_mode ?? 'per_quote_decision',
        default_recurrence_mode: parsed.data.default_recurrence_mode ?? 'per_pass',
        meal_allowance_threshold_hours:
          parsed.data.meal_allowance_threshold_hours ?? null,
        meal_allowance_amount: parsed.data.meal_allowance_amount ?? null,
        machine_rental_daily_cost: parsed.data.machine_rental_daily_cost ?? null,
      },
      { onConflict: 'company_id' },
    )
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true, message: 'Paramètres enregistrés.' }
}

export async function upsertPricingRule(
  formData: FormData,
): Promise<SettingsActionResult> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  const payload = parseJSONField<Record<string, unknown>>(formData.get('payload'))
  const parsed = PricingRuleSchema.safeParse(payload ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Règle invalide.' }
  }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  // Verify service_type belongs to caller's company
  const { data: owned } = await admin
    .from('service_types')
    .select('id')
    .eq('id', parsed.data.service_type_id)
    .eq('company_id', gate.caller.companyId)
    .maybeSingle<{ id: string }>()
  if (!owned) return { ok: false, error: 'Prestation introuvable dans ton entreprise.' }

  const { error } = await admin
    .from('pricing_rules')
    .upsert(
      {
        company_id: gate.caller.companyId,
        service_type_id: parsed.data.service_type_id,
        calculation_unit: parsed.data.calculation_unit,
        calculation_unit_other: parsed.data.calculation_unit_other ?? null,
        base_price_ht: parsed.data.base_price_ht ?? null,
        estimated_time_minutes: parsed.data.estimated_time_minutes ?? null,
        recommended_agents: parsed.data.recommended_agents ?? null,
        consumables_cost: parsed.data.consumables_cost ?? null,
        equipment_mode: parsed.data.equipment_mode ?? null,
        target_margin_pct: parsed.data.target_margin_pct ?? null,
        default_vat_rate: parsed.data.default_vat_rate ?? null,
        recurrence_mode: parsed.data.recurrence_mode ?? null,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: 'company_id,service_type_id' },
    )
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true, message: 'Tarification enregistrée.' }
}

export async function deletePricingRule(
  serviceTypeId: string,
): Promise<SettingsActionResult> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const { error } = await admin
    .from('pricing_rules')
    .delete()
    .eq('company_id', gate.caller.companyId)
    .eq('service_type_id', serviceTypeId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true }
}

// ─── Service types (CRUD libre, post-onboarding) ────────────────────────────

export async function upsertServiceType(
  formData: FormData,
): Promise<SettingsActionResult> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  const payload = parseJSONField<Record<string, unknown>>(formData.get('payload'))
  const parsed = ServiceTypeSchema.safeParse(payload ?? {})
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Prestation invalide.' }
  }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  if (parsed.data.id) {
    const { error } = await admin
      .from('service_types')
      .update({
        name: parsed.data.name.trim(),
        description: parsed.data.description ?? null,
        is_active: parsed.data.is_active ?? true,
        sort_order: parsed.data.sort_order ?? 0,
      })
      .eq('id', parsed.data.id)
      .eq('company_id', gate.caller.companyId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await admin.from('service_types').insert({
      company_id: gate.caller.companyId,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      is_default: false,
      is_active: parsed.data.is_active ?? true,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: gate.caller.userId,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/parametres')
  return { ok: true, message: 'Prestation enregistrée.' }
}

export async function archiveServiceType(
  serviceTypeId: string,
): Promise<SettingsActionResult> {
  const gate = await requirePermission('company:write')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!isSupabaseConfigured()) return { ok: true }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  // Soft-delete via is_active = false to preserve historical missions/quotes
  const { error } = await admin
    .from('service_types')
    .update({ is_active: false })
    .eq('id', serviceTypeId)
    .eq('company_id', gate.caller.companyId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/parametres')
  return { ok: true, message: 'Prestation archivée.' }
}
