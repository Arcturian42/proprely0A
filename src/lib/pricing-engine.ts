import { ServiceCategory, QuoteCostBreakdown } from '@/types'

// Pricing grids from Excel files — source of truth
const PRICING_GRIDS: Record<ServiceCategory, { threshold: number; pricePerM2: number }[]> = {
  fin_chantier: [
    { threshold: 100, pricePerM2: 8 },
    { threshold: Infinity, pricePerM2: 6 },
  ],
  terrasse: [
    { threshold: 50, pricePerM2: 7 },
    { threshold: 100, pricePerM2: 5 },
    { threshold: Infinity, pricePerM2: 3.5 },
  ],
  sols_mecanises: [
    { threshold: 100, pricePerM2: 4 },
    { threshold: 500, pricePerM2: 3 },
    { threshold: Infinity, pricePerM2: 1.75 },
  ],
  moquette: [
    { threshold: 100, pricePerM2: 3.75 },
    { threshold: 500, pricePerM2: 1.75 },
    { threshold: Infinity, pricePerM2: 1.5 },
  ],
  // Margin-based — handled separately
  bureaux_recurrent: [],
  vitres: [],
  autre: [],
}

// Minimum margin thresholds
const MIN_MARGINS: Record<ServiceCategory, number> = {
  fin_chantier: 0.40,
  terrasse: 0.40,
  sols_mecanises: 0.40,
  moquette: 0.40,
  bureaux_recurrent: 0.35,
  vitres: 0.35,
  autre: 0.35,
}

function getPricePerM2(category: ServiceCategory, surfaceM2: number): number {
  const grid = PRICING_GRIDS[category]
  if (!grid || grid.length === 0) return 0
  for (const tier of grid) {
    if (surfaceM2 <= tier.threshold) return tier.pricePerM2
  }
  return grid[grid.length - 1].pricePerM2
}

function getVitresMargin(caHT: number): number {
  if (caHT <= 100) return 0.50
  if (caHT <= 200) return 0.45
  if (caHT <= 500) return 0.40
  return 0.35
}

export interface PricingInput {
  category: ServiceCategory
  surfaceM2: number
  workers: number
  hoursPerWorker: number
  hourlyLaborRate: number
  machinesCost: number
  consumablesCost: number
  transportCost: number
  otherCosts: number
}

export function calculateQuotePrice(input: PricingInput): QuoteCostBreakdown {
  const {
    category,
    surfaceM2,
    workers,
    hoursPerWorker,
    hourlyLaborRate,
    machinesCost,
    consumablesCost,
    transportCost,
    otherCosts,
  } = input

  const laborCost = workers * hoursPerWorker * hourlyLaborRate
  const totalCostHT = laborCost + machinesCost + consumablesCost + transportCost + otherCosts

  let priceHT: number
  let marginRate: number
  const minMargin = MIN_MARGINS[category]

  if (category === 'bureaux_recurrent') {
    // Margin-based: target 35%
    priceHT = totalCostHT * 1.35
    marginRate = 0.35
  } else if (category === 'vitres') {
    // Progressive margin estimation
    // Estimate initial price, then compute degressive margin
    const estimatedRevenue = totalCostHT * 2
    const targetMargin = getVitresMargin(estimatedRevenue)
    priceHT = totalCostHT / (1 - targetMargin)
    marginRate = targetMargin
  } else {
    // m²-based pricing
    const pricePerM2 = getPricePerM2(category, surfaceM2)
    priceHT = surfaceM2 * pricePerM2
    marginRate = totalCostHT > 0 ? (priceHT - totalCostHT) / priceHT : 0.40
  }

  // Safety: enforce minimum margin
  const currentMargin = totalCostHT > 0 ? (priceHT - totalCostHT) / priceHT : 0
  if (currentMargin < minMargin && totalCostHT > 0) {
    priceHT = totalCostHT / (1 - minMargin)
    marginRate = minMargin
  }

  const vatRate = 0.20
  const priceTTC = priceHT * (1 + vatRate)

  return {
    labor_cost: Math.round(laborCost * 100) / 100,
    machines_cost: Math.round(machinesCost * 100) / 100,
    consumables_cost: Math.round(consumablesCost * 100) / 100,
    transport_cost: Math.round(transportCost * 100) / 100,
    other_costs: Math.round(otherCosts * 100) / 100,
    total_cost_ht: Math.round(totalCostHT * 100) / 100,
    margin_rate: Math.round(marginRate * 1000) / 1000,
    price_ht: Math.round(priceHT * 100) / 100,
    vat_rate: vatRate,
    price_ttc: Math.round(priceTTC * 100) / 100,
  }
}

// AI-assisted estimation based on surface and category
export function estimateFromSurface(
  category: ServiceCategory,
  surfaceM2: number,
  complexity: 'faible' | 'moyen' | 'élevé' = 'moyen'
): PricingInput {
  const complexityMultiplier = complexity === 'faible' ? 0.8 : complexity === 'élevé' ? 1.3 : 1.0

  // Base estimates per category
  const baseHoursPerM2: Record<ServiceCategory, number> = {
    fin_chantier: 0.015,
    terrasse: 0.012,
    sols_mecanises: 0.008,
    moquette: 0.010,
    bureaux_recurrent: 0.020,
    vitres: 0.030,
    autre: 0.015,
  }

  const baseMachinesCostPerM2: Record<ServiceCategory, number> = {
    fin_chantier: 0.5,
    terrasse: 0.8,
    sols_mecanises: 1.2,
    moquette: 0.6,
    bureaux_recurrent: 0.2,
    vitres: 0.3,
    autre: 0.3,
  }

  const hoursTotal = surfaceM2 * baseHoursPerM2[category] * complexityMultiplier
  const workers = Math.max(1, Math.ceil(hoursTotal / 4))
  const hoursPerWorker = hoursTotal / workers

  return {
    category,
    surfaceM2,
    workers,
    hoursPerWorker: Math.round(hoursPerWorker * 10) / 10,
    hourlyLaborRate: 14.5,
    machinesCost: Math.round(surfaceM2 * baseMachinesCostPerM2[category] * complexityMultiplier * 100) / 100,
    consumablesCost: Math.round(surfaceM2 * 0.15 * complexityMultiplier * 100) / 100,
    transportCost: 25,
    otherCosts: 0,
  }
}
