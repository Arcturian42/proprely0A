import { QuoteLineItem, ParsedQuoteData } from '@/types/pipeline'

export interface QuoteSuggestion {
  sop_label: string
  estimated_hours_per_visit: number
  agents_needed: number
  cost_per_month: number
  recommended_price: number
  margin_pct: number
}

const HOURLY_AGENT_COST = 18 // €/h including charges
const VISITS_PER_MONTH_DEFAULT = 8

function totalSurface(data: ParsedQuoteData): number {
  return data.surfaces.reduce((s, item) => s + item.area, 0)
}

function surfaceToHours(surface: number, serviceType?: string): number {
  const rates: Record<string, number> = {
    'Nettoyage bureaux': 150,
    'Nettoyage moquette': 100,
    'Vitrerie': 80,
    'Nettoyage médical': 60,
    'Nettoyage industriel': 200,
    'Parties communes': 180,
  }
  const rate = rates[serviceType ?? 'Nettoyage bureaux'] ?? 150
  return Math.max(1, surface / rate)
}

function parseFrequencyToMonthlyVisits(frequency?: string): number {
  if (!frequency) return VISITS_PER_MONTH_DEFAULT
  const match = frequency.match(/(\d+)x?\/?(semaine|mois)/i)
  if (!match) return VISITS_PER_MONTH_DEFAULT
  const count = parseInt(match[1])
  if (match[2].toLowerCase() === 'semaine') return count * 4
  return count
}

export function generateAISuggestion(data: ParsedQuoteData): QuoteSuggestion {
  const surface = totalSurface(data)
  const hoursPerVisit = surfaceToHours(surface, data.service_type)
  const agentsNeeded = Math.ceil(hoursPerVisit / 4) // max 4h per agent per visit
  const visitsPerMonth = parseFrequencyToMonthlyVisits(data.frequency)
  const costPerMonth = hoursPerVisit * agentsNeeded * visitsPerMonth * HOURLY_AGENT_COST * 0.6 // products + travel add 40%
  const recommendedPrice = Math.ceil(costPerMonth / 0.70 / 50) * 50 // 30% margin, rounded to €50
  const actualMargin = ((recommendedPrice - costPerMonth) / recommendedPrice) * 100

  return {
    sop_label: data.service_type ?? 'Nettoyage standard',
    estimated_hours_per_visit: Math.round(hoursPerVisit * 10) / 10,
    agents_needed: agentsNeeded,
    cost_per_month: Math.round(costPerMonth),
    recommended_price: recommendedPrice,
    margin_pct: Math.round(actualMargin),
  }
}

export function parsedDataToLineItems(data: ParsedQuoteData, suggestion: QuoteSuggestion): QuoteLineItem[] {
  const items: QuoteLineItem[] = []
  const visitsPerMonth = parseFrequencyToMonthlyVisits(data.frequency)

  if (data.surfaces.length > 0) {
    for (const s of data.surfaces) {
      const unitPrice = suggestion.recommended_price / totalSurface(data) / visitsPerMonth
      items.push({
        id: `li-${Date.now()}-${Math.random()}`,
        service: `${data.service_type ?? 'Nettoyage'} — ${s.type}`,
        surface: s.area,
        surface_unit: s.unit,
        frequency: data.frequency,
        unit_price: Math.round(unitPrice * 100) / 100,
        quantity: visitsPerMonth,
        total: Math.round(unitPrice * s.area * visitsPerMonth * 100) / 100,
      })
    }
  } else {
    items.push({
      id: `li-${Date.now()}`,
      service: data.service_type ?? 'Nettoyage bureaux',
      frequency: data.frequency,
      unit_price: suggestion.recommended_price / visitsPerMonth,
      quantity: visitsPerMonth,
      total: suggestion.recommended_price,
    })
  }

  return items
}

export function recalculateQuote(
  lineItems: QuoteLineItem[],
  laborCost: number,
  productsCost: number,
  travelCost: number,
  equipmentCost: number,
  tvaRate = 20
) {
  const subtotalHT = lineItems.reduce((s, li) => s + li.total, 0)
  const totalCost = laborCost + productsCost + travelCost + equipmentCost
  const margin = subtotalHT > 0 ? ((subtotalHT - totalCost) / subtotalHT) * 100 : 0
  const tvaAmount = subtotalHT * (tvaRate / 100)
  const totalTTC = subtotalHT + tvaAmount

  return {
    subtotal_ht: Math.round(subtotalHT * 100) / 100,
    tva_amount: Math.round(tvaAmount * 100) / 100,
    total_ttc: Math.round(totalTTC * 100) / 100,
    margin_pct: Math.round(margin * 10) / 10,
    selling_price: subtotalHT,
  }
}
