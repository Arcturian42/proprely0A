'use server'

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import { calculateQuoteFromRule, type QuoteInput } from './engine'
import { matchServiceTypeForCategory } from './category-mapping'
import type {
  PricingRule,
  CompanyPricingSettings,
  QuoteCostBreakdown,
  ServiceCategory,
  ServiceType,
} from '@/types'

export type PricingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export interface BatchCalcItem {
  category: ServiceCategory
  surface_m2: number
  duration_hours: number
  agents?: number
  decisions?: {
    include_consumables?: boolean
    include_travel?: boolean
    include_equipment?: boolean
  }
}

export interface BatchCalcResult {
  category: ServiceCategory
  matched_service_type_id: string | null
  /** null when no rule was found / engine couldn't compute. Caller falls back to the legacy engine. */
  costs: QuoteCostBreakdown | null
}

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
 * Batched DB-driven calculator for QuoteFlow. Loads services + rules +
 * settings once, then for each item tries to match its ServiceCategory
 * against a real service_type and compute via calculateQuoteFromRule.
 * Returns one BatchCalcResult per input — costs is null when no rule
 * applies (custom 'autre' service, or no pricing_rule configured for the
 * matched service_type). The caller then falls back to the legacy engine.
 */
export async function computeBatchFromDb(
  items: BatchCalcItem[],
): Promise<PricingActionResult<BatchCalcResult[]>> {
  const gate = await requirePermission('opportunity:read')
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      data: items.map((it) => ({
        category: it.category,
        matched_service_type_id: null,
        costs: null,
      })),
    }
  }
  const admin = await createServiceRoleClient()
  if (!admin) return { ok: false, error: 'Service role indisponible.' }

  const [{ data: services }, { data: rules }, { data: settings }] = await Promise.all([
    admin
      .from('service_types')
      .select('id, name')
      .eq('company_id', gate.caller.companyId)
      .eq('is_active', true)
      .returns<Pick<ServiceType, 'id' | 'name'>[]>(),
    admin
      .from('pricing_rules')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .returns<PricingRule[]>(),
    admin
      .from('company_pricing_settings')
      .select('*')
      .eq('company_id', gate.caller.companyId)
      .maybeSingle<CompanyPricingSettings>(),
  ])

  const rulesByService = new Map<string, PricingRule>(
    (rules ?? []).map((r) => [r.service_type_id, r]),
  )

  return {
    ok: true,
    data: items.map((it) => {
      const serviceId = matchServiceTypeForCategory(it.category, services ?? [])
      if (!serviceId || !settings) {
        return { category: it.category, matched_service_type_id: null, costs: null }
      }
      const rule = rulesByService.get(serviceId)
      if (!rule) {
        return { category: it.category, matched_service_type_id: serviceId, costs: null }
      }
      const input: QuoteInput = {
        quantity: it.surface_m2,
        duration_hours: it.duration_hours,
        agents: it.agents,
        decisions: it.decisions,
      }
      return {
        category: it.category,
        matched_service_type_id: serviceId,
        costs: calculateQuoteFromRule(input, rule, settings),
      }
    }),
  }
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
