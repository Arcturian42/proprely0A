// DB-driven quote engine — consumes pricing_rules + company_pricing_settings
// captured by the onboarding wizard. Pure & synchronous so it's trivially
// testable; the data loading lives in src/lib/pricing/server.ts as a server
// action.
//
// Replaces the legacy src/lib/pricing-engine.ts which hardcoded Excel-derived
// grids per ServiceCategory enum. The legacy file stays until QuoteFlow is
// refactored to consume this engine.
//
// Calculation model:
//   1. Labor cost      = duration_hours × agents × hourly_labor_cost
//   2. Materials cost  = equipment_mode dependent (included / separate / per-quote)
//   3. Consumables     = rule.consumables_cost OR policy default
//   4. Travel          = travel_policy decides (include / exclude / per-quote)
//   5. Meal allowance  = duration_hours ≥ threshold → amount × agents
//   6. Machine rental  = machine_days × daily_cost (caller provides days)
//   7. Total cost HT   = sum of the above + other_costs
//   8. Price HT        = total_cost_ht / (1 - target_margin_pct/100)
//   9. Effective margin= (price_ht - total_cost_ht) / price_ht
//  10. Price TTC       = price_ht × (1 + vat_rate/100)
//
// Margins:
//   - target_margin_pct comes from rule override OR company default OR 35% safety
//   - VAT comes from rule override OR company default OR 20% (France standard)

import type {
  PricingRule,
  CompanyPricingSettings,
  QuoteCostBreakdown,
} from '@/types'

export interface QuoteInput {
  /** Quantity for the rule's calculation_unit (m², hours, passes, etc.) */
  quantity: number
  /** Number of agents on the mission. Defaults to rule.recommended_agents. */
  agents?: number
  /** Total intervention duration in hours. Required to compute labor cost. */
  duration_hours: number
  /** Optional machine rental: number of days × daily cost. */
  machine_days?: number
  /** Optional extras the caller wants billed separately (e.g. specific products) */
  other_costs?: number
  /** Per-quote decisions when policy = 'per_quote_decision' */
  decisions?: {
    include_consumables?: boolean
    include_travel?: boolean
    include_equipment?: boolean
  }
  /** Per-quote travel cost (when included). Computed by caller (km × rate). */
  travel_cost?: number
}

const DEFAULT_TARGET_MARGIN_PCT = 35
const DEFAULT_VAT_RATE_PCT = 20

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function resolveMargin(rule: PricingRule, settings: CompanyPricingSettings): number {
  return (
    rule.target_margin_pct ??
    settings.default_target_margin_pct ??
    DEFAULT_TARGET_MARGIN_PCT
  )
}

function resolveVat(rule: PricingRule, settings: CompanyPricingSettings): number {
  return rule.default_vat_rate ?? settings.default_vat_rate ?? DEFAULT_VAT_RATE_PCT
}

function resolveEquipmentMode(rule: PricingRule, settings: CompanyPricingSettings) {
  return rule.equipment_mode ?? settings.equipment_mode
}

function resolveAgents(input: QuoteInput, rule: PricingRule): number {
  const fromInput = input.agents
  if (typeof fromInput === 'number' && fromInput > 0) return fromInput
  return rule.recommended_agents ?? 1
}

function shouldIncludeConsumables(
  input: QuoteInput,
  settings: CompanyPricingSettings,
): boolean {
  if (settings.consumables_policy === 'always_include') return true
  if (settings.consumables_policy === 'never_include') return false
  return Boolean(input.decisions?.include_consumables)
}

function shouldIncludeTravel(
  input: QuoteInput,
  settings: CompanyPricingSettings,
): boolean {
  if (settings.travel_policy === 'always_include') return true
  if (settings.travel_policy === 'never_include') return false
  return Boolean(input.decisions?.include_travel)
}

function shouldIncludeEquipment(
  input: QuoteInput,
  rule: PricingRule,
  settings: CompanyPricingSettings,
): boolean {
  const mode = resolveEquipmentMode(rule, settings)
  if (mode === 'included') return true
  if (mode === 'separate_line') return true // separate line still adds to total cost
  return Boolean(input.decisions?.include_equipment)
}

function computeMealAllowance(
  input: QuoteInput,
  settings: CompanyPricingSettings,
  agents: number,
): number {
  const threshold = settings.meal_allowance_threshold_hours
  const amount = settings.meal_allowance_amount
  if (!threshold || !amount) return 0
  if (input.duration_hours < threshold) return 0
  return round2(amount * agents)
}

function computeMachineRental(
  input: QuoteInput,
  settings: CompanyPricingSettings,
): number {
  const days = input.machine_days ?? 0
  const dailyCost = settings.machine_rental_daily_cost ?? 0
  if (days <= 0 || dailyCost <= 0) return 0
  return round2(days * dailyCost)
}

export function calculateQuoteFromRule(
  input: QuoteInput,
  rule: PricingRule,
  settings: CompanyPricingSettings,
): QuoteCostBreakdown {
  const hourlyLaborCost = settings.hourly_labor_cost ?? 0
  const agents = resolveAgents(input, rule)

  // 1. Labor
  const laborCost = round2(input.duration_hours * agents * hourlyLaborCost)

  // 2. Machines / equipment
  const includeEquipment = shouldIncludeEquipment(input, rule, settings)
  const machineRental = computeMachineRental(input, settings)
  const machinesCost = includeEquipment ? machineRental : 0

  // 3. Consumables
  const includeConsumables = shouldIncludeConsumables(input, settings)
  const consumablesCost = includeConsumables ? rule.consumables_cost ?? 0 : 0

  // 4. Travel
  const includeTravel = shouldIncludeTravel(input, settings)
  const transportCost = includeTravel ? input.travel_cost ?? 0 : 0

  // 5. Meals (long-mission allowance)
  const mealCost = computeMealAllowance(input, settings, agents)

  // 6. Other extras (machine outside rental, specific products, etc.)
  const otherCosts = round2((input.other_costs ?? 0) + mealCost)

  // 7. Total cost HT
  const totalCostHt = round2(
    laborCost + machinesCost + consumablesCost + transportCost + otherCosts,
  )

  // 8. Margin → price HT
  const targetMarginPct = resolveMargin(rule, settings)
  const targetMargin = targetMarginPct / 100
  // Guard against margin = 100% (divide by zero) — clamp to 95%.
  const safeMargin = Math.min(0.95, Math.max(0, targetMargin))
  const priceHt = totalCostHt > 0 ? round2(totalCostHt / (1 - safeMargin)) : 0

  // 9. Effective margin rate
  const marginRate = priceHt > 0 ? round3((priceHt - totalCostHt) / priceHt) : 0

  // 10. VAT
  const vatRatePct = resolveVat(rule, settings)
  const vatRate = vatRatePct / 100
  const priceTtc = round2(priceHt * (1 + vatRate))

  return {
    labor_cost: laborCost,
    machines_cost: machinesCost,
    consumables_cost: consumablesCost,
    transport_cost: transportCost,
    other_costs: otherCosts,
    total_cost_ht: totalCostHt,
    margin_rate: marginRate,
    price_ht: priceHt,
    vat_rate: vatRate,
    price_ttc: priceTtc,
  }
}

/**
 * Builds a default quote input from the rule itself, useful when the caller
 * just wants a baseline estimate without specifying every parameter.
 */
export function defaultQuoteInput(rule: PricingRule, quantity: number): QuoteInput {
  const durationMinutes = rule.estimated_time_minutes ?? 60
  return {
    quantity,
    agents: rule.recommended_agents ?? 1,
    duration_hours: round2(durationMinutes / 60),
    other_costs: 0,
  }
}
