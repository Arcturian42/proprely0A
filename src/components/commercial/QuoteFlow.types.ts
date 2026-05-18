import type { Opportunity, QuoteCostBreakdown, ServiceCategory } from '@/types'
import type { PricingInput } from '@/lib/pricing-engine'

// Extracted from QuoteFlow.tsx to keep the main component file focused on
// orchestration. These types are also reused by the future split into
// per-step sub-components (Services / Notes / Media / Calc / Preview).

export type Complexity = 'faible' | 'moyen' | 'élevé'

export interface ServiceLine {
  id: string
  category: ServiceCategory
  surface: string
  complexity: Complexity
  frequency: string
  notes: string
}

export interface ComputedServiceLine {
  line: ServiceLine
  pricingInput: PricingInput
  costs: QuoteCostBreakdown
  /** 'db' when the breakdown comes from the user's pricing_rules,
   *  'legacy' when it comes from the hardcoded Excel-derived grids. */
  source: 'db' | 'legacy'
}

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5

export interface QuoteFlowProps {
  opportunity: Opportunity
  onQuoteSent?: () => void
}
