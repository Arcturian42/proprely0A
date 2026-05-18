'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { track } from '@/lib/analytics/posthog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StepCard } from './StepCard'
import {
  CALCULATION_UNIT_LABELS_FR,
  RECURRENCE_MODE_LABELS_FR,
} from '@/lib/onboarding/defaults'
import { setPricingRules, skipPricing } from '@/app/actions/onboarding'
import type { CalculationUnit, RecurrenceMode } from '@/types'

interface PricingRuleDraft {
  calculation_unit: CalculationUnit
  base_price_ht: string
  estimated_time_minutes: string
  recommended_agents: string
  consumables_cost: string
  target_margin_pct: string
  default_vat_rate: string
  recurrence_mode: RecurrenceMode
}

function emptyDraft(): PricingRuleDraft {
  return {
    calculation_unit: 'm2',
    base_price_ht: '',
    estimated_time_minutes: '',
    recommended_agents: '1',
    consumables_cost: '',
    target_margin_pct: '',
    default_vat_rate: '',
    recurrence_mode: 'one_shot',
  }
}

function parseNumeric(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseInteger(value: string): number | null {
  const n = parseNumeric(value)
  if (n === null) return null
  return Math.round(n)
}

export function Step4PricingRules({
  services,
}: {
  services: { id: string; name: string; is_default: boolean }[]
}) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, PricingRuleDraft>>(() =>
    Object.fromEntries(services.map((s) => [s.id, emptyDraft()])),
  )
  const [pendingSave, startSave] = useTransition()
  const [pendingSkip, startSkip] = useTransition()
  const isBusy = pendingSave || pendingSkip

  function update(serviceId: string, patch: Partial<PricingRuleDraft>) {
    setDrafts((d) => ({ ...d, [serviceId]: { ...d[serviceId], ...patch } }))
  }

  function handleSave() {
    const rules = services.map((s) => {
      const d = drafts[s.id]
      return {
        service_type_id: s.id,
        calculation_unit: d.calculation_unit,
        base_price_ht: parseNumeric(d.base_price_ht),
        estimated_time_minutes: parseInteger(d.estimated_time_minutes),
        recommended_agents: parseInteger(d.recommended_agents) ?? 1,
        consumables_cost: parseNumeric(d.consumables_cost),
        target_margin_pct: parseNumeric(d.target_margin_pct),
        default_vat_rate: parseNumeric(d.default_vat_rate),
        recurrence_mode: d.recurrence_mode,
      }
    })

    const fd = new FormData()
    fd.append('payload', JSON.stringify({ rules }))
    startSave(async () => {
      const res = await setPricingRules(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_completed', { step: 4, action: 'set_pricing_rules', count: rules.length })
      toast.success(res.message ?? 'Règles enregistrées.')
      router.push('/onboarding/5')
    })
  }

  function handleSkip() {
    startSkip(async () => {
      const res = await skipPricing()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_skipped', { step: 4 })
      router.push('/onboarding/5')
    })
  }

  if (services.length === 0) {
    return (
      <StepCard
        title="Comment calcules-tu tes devis ?"
        description="Aucune prestation à tarifer pour l'instant. Tu peux passer cette étape."
        footer={
          <div className="flex justify-end">
            <Button onClick={handleSkip} disabled={isBusy}>
              {pendingSkip ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Passage...
                </>
              ) : (
                'Continuer'
              )}
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-slate-500">
          Tu pourras configurer la tarification depuis les paramètres une fois que tu auras
          ajouté des prestations.
        </p>
      </StepCard>
    )
  }

  return (
    <StepCard
      title="Comment calcules-tu tes devis ?"
      description="Pour chaque prestation, indique comment tu calcules généralement ton prix. Proprely utilisera ces règles pour générer des estimations automatiques. Tous les champs sont facultatifs — tu pourras les compléter plus tard."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isBusy}
            className="text-[13px] text-slate-500 hover:text-slate-700 disabled:opacity-50 underline-offset-2 hover:underline"
          >
            {pendingSkip ? 'Passage...' : 'Configurer plus tard'}
          </button>
          <Button onClick={handleSave} disabled={isBusy} className="bg-indigo-600 hover:bg-indigo-700">
            {pendingSave ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
              </>
            ) : (
              'Enregistrer mes règles'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        {services.map((service) => {
          const d = drafts[service.id]
          return (
            <details
              key={service.id}
              className="rounded-lg border border-slate-200 bg-white open:bg-slate-50/40 group"
              open
            >
              <summary className="cursor-pointer list-none px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <span className="text-[13px] font-medium text-slate-900">{service.name}</span>
                <span className="text-[11px] text-slate-400 group-open:hidden">Configurer</span>
                <span className="text-[11px] text-slate-400 hidden group-open:inline">Réduire</span>
              </summary>

              <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3">
                <div>
                  <Label className="text-[12px]">Unité principale de calcul</Label>
                  <Select
                    value={d.calculation_unit}
                    onValueChange={(v) =>
                      update(service.id, { calculation_unit: v as CalculationUnit })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CALCULATION_UNIT_LABELS_FR) as CalculationUnit[]).map((u) => (
                        <SelectItem key={u} value={u}>
                          {CALCULATION_UNIT_LABELS_FR[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[12px]">Prix HT de base</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={d.base_price_ht}
                      onChange={(e) => update(service.id, { base_price_ht: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="€ par unité"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">Temps moyen estimé (min)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={d.estimated_time_minutes}
                      onChange={(e) => update(service.id, { estimated_time_minutes: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="ex : 120"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">Nombre d&apos;agents recommandé</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={d.recommended_agents}
                      onChange={(e) => update(service.id, { recommended_agents: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">Coût consommables estimé</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={d.consumables_cost}
                      onChange={(e) => update(service.id, { consumables_cost: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="€"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">Marge cible (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={d.target_margin_pct}
                      onChange={(e) => update(service.id, { target_margin_pct: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="ex : 35"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">TVA par défaut (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={d.default_vat_rate}
                      onChange={(e) => update(service.id, { default_vat_rate: e.target.value })}
                      disabled={isBusy}
                      className="mt-1"
                      placeholder="ex : 20"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[12px]">Récurrence</Label>
                  <Select
                    value={d.recurrence_mode}
                    onValueChange={(v) =>
                      update(service.id, { recurrence_mode: v as RecurrenceMode })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RECURRENCE_MODE_LABELS_FR) as RecurrenceMode[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {RECURRENCE_MODE_LABELS_FR[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </StepCard>
  )
}
