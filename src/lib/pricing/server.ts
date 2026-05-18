'use server'

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import { calculateQuoteFromRule, type QuoteInput } from './engine'
import type {
  PricingRule,
  CompanyPricingSettings,
  QuoteCostBreakdown,
} from '@/types'

export type PricingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Loads pricing context (rule + company settings) for a given service_type.
 * Returns null rule when none configured yet — caller falls back to legacy
 * pricing-engine.ts grids.
 */
export async function loadPricingContext(
  serviceTypeId: string,
): Promise<
  PricingActionResult<{
    rule: PricingRule | null
    settings: CompanyPricingSettings | null
  }>
> {
  const gate = await requirePermission('opportunity:read')
  if (!gate.ok) return { ok: false, error: gate.error }

  if (!isSupabaseConfigured()) {
    return { ok: true, data: { rule: null, settings: null } }
  }

  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const [{ data: rule }, { data: settings }] = await Promise.all([
    admin
      .from('pricing_rules')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .eq('service_type_id', serviceTypeId)
      .maybeSingle<PricingRule>(),
    admin
      .from('company_pricing_settings')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .maybeSingle<CompanyPricingSettings>(),
  ])

  return { ok: true, data: { rule: rule ?? null, settings: settings ?? null } }
}

/**
 * One-shot pricing calculation: load rule + settings, then compute the
 * breakdown. Returns ok:false if no rule is configured for this service.
 */
export async function calculateQuote(
  serviceTypeId: string,
  input: QuoteInput,
): Promise<PricingActionResult<QuoteCostBreakdown>> {
  const ctx = await loadPricingContext(serviceTypeId)
  if (!ctx.ok) return ctx
  if (!ctx.data.rule) {
    return {
      ok: false,
      error:
        "Aucune règle de tarification configurée pour cette prestation. Définis-la dans Paramètres > Tarification.",
    }
  }
  if (!ctx.data.settings) {
    return {
      ok: false,
      error:
        "Paramètres de tarification de l'entreprise introuvables. Complète l'onboarding ou Paramètres > Tarification.",
    }
  }
  const result = calculateQuoteFromRule(input, ctx.data.rule, ctx.data.settings)
  return { ok: true, data: result }
}
