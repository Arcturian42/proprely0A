import { describe, expect, it } from 'vitest'
import { calculateQuoteFromRule, defaultQuoteInput, type QuoteInput } from './engine'
import type { PricingRule, CompanyPricingSettings } from '@/types'

const baseRule = (overrides: Partial<PricingRule> = {}): PricingRule => ({
  id: 'rule-1',
  company_id: 'co-1',
  service_type_id: 'svc-1',
  calculation_unit: 'm2',
  calculation_unit_other: null,
  base_price_ht: null,
  estimated_time_minutes: 120,
  recommended_agents: 2,
  consumables_cost: null,
  equipment_mode: null,
  target_margin_pct: null,
  default_vat_rate: null,
  recurrence_mode: 'one_shot',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const baseSettings = (
  overrides: Partial<CompanyPricingSettings> = {},
): CompanyPricingSettings => ({
  company_id: 'co-1',
  hourly_labor_cost: 25,
  default_target_margin_pct: 35,
  default_vat_rate: 20,
  consumables_policy: 'per_quote_decision',
  travel_policy: 'per_quote_decision',
  equipment_mode: 'per_quote_decision',
  default_recurrence_mode: 'per_pass',
  meal_allowance_threshold_hours: null,
  meal_allowance_amount: null,
  machine_rental_daily_cost: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('calculateQuoteFromRule', () => {
  it('computes labor cost = duration × agents × hourly_rate', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 4, agents: 2 },
      baseRule(),
      baseSettings({ hourly_labor_cost: 25 }),
    )
    // 4h × 2 agents × 25€/h = 200
    expect(result.labor_cost).toBe(200)
  })

  it('falls back to rule.recommended_agents when input.agents omitted', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 4 },
      baseRule({ recommended_agents: 3 }),
      baseSettings({ hourly_labor_cost: 20 }),
    )
    // 4 × 3 × 20 = 240
    expect(result.labor_cost).toBe(240)
  })

  it('applies target_margin_pct from rule override', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ target_margin_pct: 50 }),
      baseSettings({ hourly_labor_cost: 30 }),
    )
    // cost = 2 × 1 × 30 = 60; price_ht = 60 / (1 - 0.5) = 120
    expect(result.total_cost_ht).toBe(60)
    expect(result.price_ht).toBe(120)
    expect(result.margin_rate).toBe(0.5)
  })

  it('falls back to settings.default_target_margin_pct when rule has none', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ target_margin_pct: null }),
      baseSettings({ hourly_labor_cost: 30, default_target_margin_pct: 40 }),
    )
    // cost = 60; price_ht = 60 / 0.6 = 100
    expect(result.price_ht).toBe(100)
  })

  it('uses 35% safety default when no margin configured', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ target_margin_pct: null }),
      baseSettings({ hourly_labor_cost: 30, default_target_margin_pct: null }),
    )
    // cost = 60; price_ht = 60 / 0.65 = 92.31
    expect(result.price_ht).toBeCloseTo(92.31, 2)
  })

  it('clamps margin to 95% to avoid divide-by-zero', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 1, agents: 1 },
      baseRule({ target_margin_pct: 99 }),
      baseSettings({ hourly_labor_cost: 100 }),
    )
    // cost = 100; clamped to 95% margin → price = 100 / 0.05 = 2000
    expect(result.price_ht).toBe(2000)
  })

  it('always_include consumables policy adds rule.consumables_cost', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ consumables_cost: 15 }),
      baseSettings({
        hourly_labor_cost: 20,
        consumables_policy: 'always_include',
      }),
    )
    expect(result.consumables_cost).toBe(15)
    expect(result.total_cost_ht).toBe(40 + 15)
  })

  it('never_include consumables policy ignores rule.consumables_cost', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ consumables_cost: 15 }),
      baseSettings({
        hourly_labor_cost: 20,
        consumables_policy: 'never_include',
      }),
    )
    expect(result.consumables_cost).toBe(0)
  })

  it('per_quote_decision honors caller decisions.include_consumables', () => {
    const settings = baseSettings({
      hourly_labor_cost: 20,
      consumables_policy: 'per_quote_decision',
    })
    const rule = baseRule({ consumables_cost: 15 })

    const withIncl = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1, decisions: { include_consumables: true } },
      rule,
      settings,
    )
    expect(withIncl.consumables_cost).toBe(15)

    const withoutIncl = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      rule,
      settings,
    )
    expect(withoutIncl.consumables_cost).toBe(0)
  })

  it('adds meal allowance when duration ≥ threshold', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 8, agents: 2 },
      baseRule(),
      baseSettings({
        hourly_labor_cost: 25,
        meal_allowance_threshold_hours: 6,
        meal_allowance_amount: 12,
      }),
    )
    // meal = 12 × 2 agents = 24 (included in other_costs)
    expect(result.other_costs).toBe(24)
  })

  it('skips meal allowance when duration < threshold', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 4, agents: 2 },
      baseRule(),
      baseSettings({
        hourly_labor_cost: 25,
        meal_allowance_threshold_hours: 6,
        meal_allowance_amount: 12,
      }),
    )
    expect(result.other_costs).toBe(0)
  })

  it('adds machine rental = days × daily_cost when equipment included', () => {
    const result = calculateQuoteFromRule(
      {
        quantity: 100,
        duration_hours: 2,
        agents: 1,
        machine_days: 1,
        decisions: { include_equipment: true },
      },
      baseRule({ equipment_mode: null }),
      baseSettings({
        hourly_labor_cost: 25,
        equipment_mode: 'per_quote_decision',
        machine_rental_daily_cost: 60,
      }),
    )
    expect(result.machines_cost).toBe(60)
  })

  it('always_include equipment ignores per-quote decision', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1, machine_days: 2 },
      baseRule({ equipment_mode: 'included' }),
      baseSettings({
        hourly_labor_cost: 25,
        machine_rental_daily_cost: 50,
      }),
    )
    expect(result.machines_cost).toBe(100)
  })

  it('applies VAT from rule override over settings', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule({ target_margin_pct: 50, default_vat_rate: 10 }),
      baseSettings({ hourly_labor_cost: 30, default_vat_rate: 20 }),
    )
    // price_ht = 120; ttc = 120 × 1.10 = 132
    expect(result.vat_rate).toBe(0.1)
    expect(result.price_ttc).toBe(132)
  })

  it('travel cost is added when policy includes it', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1, travel_cost: 25 },
      baseRule(),
      baseSettings({ hourly_labor_cost: 25, travel_policy: 'always_include' }),
    )
    expect(result.transport_cost).toBe(25)
  })

  it('travel cost ignored when policy excludes it', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1, travel_cost: 25 },
      baseRule(),
      baseSettings({ hourly_labor_cost: 25, travel_policy: 'never_include' }),
    )
    expect(result.transport_cost).toBe(0)
  })

  it('handles zero hourly_labor_cost gracefully', () => {
    const result = calculateQuoteFromRule(
      { quantity: 100, duration_hours: 2, agents: 1 },
      baseRule(),
      baseSettings({ hourly_labor_cost: null }),
    )
    expect(result.labor_cost).toBe(0)
    expect(result.price_ht).toBe(0)
    expect(result.margin_rate).toBe(0)
  })

  it('full end-to-end scenario : long mission with all extras', () => {
    const result = calculateQuoteFromRule(
      {
        quantity: 500, // 500 m²
        duration_hours: 8,
        agents: 3,
        machine_days: 1,
        travel_cost: 40,
        decisions: {
          include_consumables: true,
          include_travel: true,
          include_equipment: true,
        },
      },
      baseRule({
        consumables_cost: 30,
        equipment_mode: 'per_quote_decision',
        target_margin_pct: 40,
      }),
      baseSettings({
        hourly_labor_cost: 25,
        meal_allowance_threshold_hours: 6,
        meal_allowance_amount: 12,
        machine_rental_daily_cost: 60,
        default_vat_rate: 20,
      }),
    )
    // Labor: 8 × 3 × 25 = 600
    // Machines: 1 × 60 = 60
    // Consumables: 30
    // Travel: 40
    // Meal: 12 × 3 = 36 (in other_costs)
    // Total HT: 600 + 60 + 30 + 40 + 36 = 766
    // Margin 40%: price_ht = 766 / 0.6 = 1276.67
    // TTC: 1276.67 × 1.20 = 1532.00
    expect(result.labor_cost).toBe(600)
    expect(result.machines_cost).toBe(60)
    expect(result.consumables_cost).toBe(30)
    expect(result.transport_cost).toBe(40)
    expect(result.other_costs).toBe(36)
    expect(result.total_cost_ht).toBe(766)
    expect(result.price_ht).toBeCloseTo(1276.67, 1)
    expect(result.price_ttc).toBeCloseTo(1532, 0)
  })
})

describe('defaultQuoteInput', () => {
  it('derives duration_hours from rule.estimated_time_minutes', () => {
    const input: QuoteInput = defaultQuoteInput(
      baseRule({ estimated_time_minutes: 180, recommended_agents: 2 }),
      100,
    )
    expect(input.duration_hours).toBe(3)
    expect(input.agents).toBe(2)
    expect(input.quantity).toBe(100)
  })

  it('defaults to 60 minutes when estimated_time_minutes is null', () => {
    const input = defaultQuoteInput(
      baseRule({ estimated_time_minutes: null }),
      50,
    )
    expect(input.duration_hours).toBe(1)
  })
})
