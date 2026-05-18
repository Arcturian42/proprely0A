import Link from 'next/link'
import { CheckCircle2, ChevronRight, Settings2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SERVICE_CATEGORY_LABELS } from '@/lib/constants'
import type { PricingInput } from '@/lib/pricing-engine'
import { formatCurrency } from '@/lib/utils'
import type { QuoteCostBreakdown } from '@/types'

import { SERVICE_ICONS, STEP_TITLES } from './QuoteFlow.constants'
import { CostRow, StepHeader } from './QuoteFlow.shared'
import type { ComputedServiceLine } from './QuoteFlow.types'

// Step 4 — AI calculation pulse + per-service breakdown table.
// Extracted from QuoteFlow.tsx.

interface Props {
  isCalculating: boolean
  computedLines: ComputedServiceLine[]
  aggregatedCosts: QuoteCostBreakdown
  onBack: () => void
  onNext: () => void
}

export function StepCalculation({
  isCalculating,
  computedLines,
  aggregatedCosts,
  onBack,
  onNext,
}: Props) {
  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[4]} step={4} total={5} onBack={onBack} />

      {isCalculating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 opacity-20 animate-ping absolute inset-0" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center relative">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-800">Calcul IA en cours...</p>
            <p className="text-xs text-slate-500">
              Analyse des services et estimation des coûts
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Services analysés
          </p>

          {computedLines.map(({ line, pricingInput, costs, source }) => (
            <ServiceBreakdown
              key={line.id}
              line={line}
              pricingInput={pricingInput}
              costs={costs}
              source={source}
            />
          ))}

          {computedLines.length > 1 && (
            <AggregatedTotalCard costs={aggregatedCosts} />
          )}

          <Link
            href="/parametres?tab=simulateur"
            target="_blank"
            className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2.5 text-[12px] text-indigo-900 hover:bg-indigo-50 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <span className="flex-1">
              Estimation basée sur les grilles standard. Configure tes propres règles dans
              <span className="font-medium"> Paramètres &gt; Simulateur</span> pour des
              prix calibrés à ta structure de coûts.
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
          </Link>

          <Button
            onClick={onNext}
            className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
          >
            Générer le devis <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ServiceBreakdown({
  line,
  pricingInput,
  costs,
  source,
}: {
  line: ComputedServiceLine['line']
  pricingInput: PricingInput
  costs: QuoteCostBreakdown
  source: ComputedServiceLine['source']
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-slate-600">{SERVICE_ICONS[line.category]}</span>
        <span className="text-sm font-semibold text-slate-900 flex-1">
          {SERVICE_CATEGORY_LABELS[line.category]} {line.surface}m²
        </span>
        {source === 'db' ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700"
            title="Calculé avec tes règles de tarification"
          >
            <Settings2 className="w-3 h-3" />
            Tes règles
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
            title="Grilles standard — configure /parametres > Tarification pour calibrer"
          >
            Standard
          </span>
        )}
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-2 text-xs">
        <CostRow label="Main d'œuvre" value={formatCurrency(costs.labor_cost)} />
        <CostRow label="Machines" value={formatCurrency(costs.machines_cost)} />
        <CostRow label="Consommables" value={formatCurrency(costs.consumables_cost)} />
        <CostRow label="Transport" value={formatCurrency(costs.transport_cost)} />
        <div className="col-span-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-800">Prix HT</span>
          <span className="font-bold text-slate-900">{formatCurrency(costs.price_ht)}</span>
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-slate-500">Marge</span>
          <span
            className={`font-semibold ${
              costs.margin_rate >= 0.35 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {Math.round(costs.margin_rate * 100)}% {costs.margin_rate >= 0.35 ? '✅' : '⚠️'}
          </span>
        </div>
        <div className="col-span-2 text-slate-400 text-[10px]">
          {pricingInput.workers} agent{pricingInput.workers > 1 ? 's' : ''} ×{' '}
          {pricingInput.hoursPerWorker}h @ {pricingInput.hourlyLaborRate}€/h
        </div>
      </div>
    </div>
  )
}

function AggregatedTotalCard({ costs }: { costs: QuoteCostBreakdown }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white space-y-2">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total combiné</p>
      <div className="flex justify-between text-sm text-slate-300">
        <span>TOTAL HT</span>
        <span className="font-semibold text-white">{formatCurrency(costs.price_ht)}</span>
      </div>
      <div className="flex justify-between text-sm text-slate-400">
        <span>TVA 20%</span>
        <span>{formatCurrency(costs.price_ttc - costs.price_ht)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-2 mt-1">
        <span>TOTAL TTC</span>
        <span>{formatCurrency(costs.price_ttc)}</span>
      </div>
      <p
        className={`text-xs ${
          costs.margin_rate >= 0.35 ? 'text-green-400' : 'text-red-400'
        }`}
      >
        Marge globale : {Math.round(costs.margin_rate * 100)}%{' '}
        {costs.margin_rate >= 0.35 ? '✅' : '⚠️'}
      </p>
    </div>
  )
}
