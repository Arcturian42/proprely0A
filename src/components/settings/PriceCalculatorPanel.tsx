'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Calculator, Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  loadPricingSettings,
} from '@/app/actions/settings-pricing'
import { calculateQuoteFromRule, type QuoteInput } from '@/lib/pricing/engine'
import type {
  CompanyPricingSettings,
  PricingRule,
  QuoteCostBreakdown,
  ServiceType,
} from '@/types'
import { formatCurrency } from '@/lib/utils'

interface DraftState {
  service_type_id: string
  quantity: string
  duration_hours: string
  agents: string
  machine_days: string
  travel_cost: string
  other_costs: string
  include_consumables: boolean
  include_travel: boolean
  include_equipment: boolean
}

function emptyDraft(): DraftState {
  return {
    service_type_id: '',
    quantity: '100',
    duration_hours: '4',
    agents: '2',
    machine_days: '0',
    travel_cost: '0',
    other_costs: '0',
    include_consumables: false,
    include_travel: false,
    include_equipment: false,
  }
}

function parseNum(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Live tester for the DB-driven pricing engine. Owners use this to sanity
 * check their pricing_rules + company_pricing_settings without going through
 * the full quote flow. Once QuoteFlow is migrated to consume this engine,
 * this panel becomes a debug-only tool.
 */
export function PriceCalculatorPanel() {
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [settings, setSettings] = useState<CompanyPricingSettings | null>(null)
  const [services, setServices] = useState<ServiceType[]>([])
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadPricingSettings()
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setSettings(res.data.settings)
          setServices(res.data.services)
          setRules(res.data.rules)
          // Pre-select first service that has a rule
          const firstRuledService = res.data.services.find((s) =>
            res.data.rules.some((r) => r.service_type_id === s.id),
          )
          if (firstRuledService) {
            setDraft((d) => ({ ...d, service_type_id: firstRuledService.id }))
          }
        } else {
          toast.error(res.error)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedRule = useMemo(
    () => rules.find((r) => r.service_type_id === draft.service_type_id) ?? null,
    [rules, draft.service_type_id],
  )

  const breakdown = useMemo<QuoteCostBreakdown | null>(() => {
    if (!selectedRule || !settings) return null
    const quantity = parseNum(draft.quantity)
    const duration = parseNum(draft.duration_hours)
    if (quantity === null || duration === null) return null
    const input: QuoteInput = {
      quantity,
      duration_hours: duration,
      agents: parseNum(draft.agents) ?? undefined,
      machine_days: parseNum(draft.machine_days) ?? 0,
      travel_cost: parseNum(draft.travel_cost) ?? 0,
      other_costs: parseNum(draft.other_costs) ?? 0,
      decisions: {
        include_consumables: draft.include_consumables,
        include_travel: draft.include_travel,
        include_equipment: draft.include_equipment,
      },
    }
    return calculateQuoteFromRule(input, selectedRule, settings)
  }, [selectedRule, settings, draft])

  function update(patch: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  if (loading) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="py-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const noRules = rules.length === 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            Simulateur de devis
          </CardTitle>
          <p className="text-[12px] text-slate-500 mt-1">
            Teste tes règles de tarification sur un scénario réel. Les valeurs
            viennent de la table <code>pricing_rules</code> et de tes
            paramètres globaux.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {noRules ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">
              Aucune règle de tarification configurée. Complète l&apos;onboarding
              ou utilise l&apos;onglet « Tarification » pour en créer.
            </p>
          ) : (
            <>
              <div>
                <Label className="text-[12px]">Prestation</Label>
                <Select
                  value={draft.service_type_id}
                  onValueChange={(v) => update({ service_type_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une prestation" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => {
                      const hasRule = rules.some((r) => r.service_type_id === s.id)
                      return (
                        <SelectItem key={s.id} value={s.id} disabled={!hasRule}>
                          {s.name} {!hasRule && '(pas de règle)'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[12px]">Quantité</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.quantity}
                    onChange={(e) => update({ quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Durée (heures)</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.duration_hours}
                    onChange={(e) => update({ duration_hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Agents</Label>
                  <Input
                    inputMode="numeric"
                    value={draft.agents}
                    onChange={(e) => update({ agents: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Jours machine</Label>
                  <Input
                    inputMode="numeric"
                    value={draft.machine_days}
                    onChange={(e) => update({ machine_days: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Coût trajet (€)</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.travel_cost}
                    onChange={(e) => update({ travel_cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Extras (€)</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.other_costs}
                    onChange={(e) => update({ other_costs: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Décisions à la demande (utilisées si les policies sont
                  réglées sur « À choisir à chaque devis »).
                </p>
                <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={draft.include_consumables}
                    onCheckedChange={(c) => update({ include_consumables: c === true })}
                  />
                  Inclure consommables
                </label>
                <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={draft.include_travel}
                    onCheckedChange={(c) => update({ include_travel: c === true })}
                  />
                  Inclure trajet
                </label>
                <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={draft.include_equipment}
                    onCheckedChange={(c) => update({ include_equipment: c === true })}
                  />
                  Inclure matériel
                </label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimation calculée</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown === null ? (
            <p className="text-[13px] text-slate-400 py-12 text-center">
              {noRules
                ? '—'
                : !draft.service_type_id
                  ? 'Choisis une prestation pour voir le détail.'
                  : 'Renseigne quantité et durée.'}
            </p>
          ) : (
            <dl className="space-y-2 text-[13px]">
              <Row label="Main d'œuvre" value={formatCurrency(breakdown.labor_cost)} />
              <Row label="Matériel / location" value={formatCurrency(breakdown.machines_cost)} />
              <Row label="Consommables" value={formatCurrency(breakdown.consumables_cost)} />
              <Row label="Trajet" value={formatCurrency(breakdown.transport_cost)} />
              <Row label="Autres / repas" value={formatCurrency(breakdown.other_costs)} />
              <div className="border-t border-slate-200 pt-2 mt-2 space-y-2">
                <Row
                  label="Coût total HT"
                  value={formatCurrency(breakdown.total_cost_ht)}
                  bold
                />
                <Row
                  label={`Marge (${Math.round(breakdown.margin_rate * 100)}%)`}
                  value={formatCurrency(breakdown.price_ht - breakdown.total_cost_ht)}
                />
                <Row
                  label="Prix HT"
                  value={formatCurrency(breakdown.price_ht)}
                  bold
                  emphasis
                />
                <Row
                  label={`TVA (${Math.round(breakdown.vat_rate * 100)}%)`}
                  value={formatCurrency(breakdown.price_ttc - breakdown.price_ht)}
                />
                <Row
                  label="Prix TTC"
                  value={formatCurrency(breakdown.price_ttc)}
                  bold
                  emphasis
                />
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  emphasis,
}: {
  label: string
  value: string
  bold?: boolean
  emphasis?: boolean
}) {
  return (
    <div className="flex justify-between">
      <dt className={`text-slate-600 ${bold ? 'font-medium' : ''}`}>{label}</dt>
      <dd
        className={`tabular-nums ${
          emphasis ? 'text-indigo-700 font-semibold' : bold ? 'text-slate-900 font-medium' : 'text-slate-700'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
