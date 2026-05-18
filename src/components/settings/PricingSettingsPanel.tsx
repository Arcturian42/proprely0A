'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  loadPricingSettings,
  updatePricingSettings,
} from '@/app/actions/settings-pricing'
import {
  CONSUMABLES_POLICY_LABELS_FR,
  EQUIPMENT_MODE_LABELS_FR,
  RECURRENCE_MODE_LABELS_FR,
  TRAVEL_POLICY_LABELS_FR,
} from '@/lib/onboarding/defaults'
import type {
  CompanyPricingSettings,
  ConsumablesPolicy,
  EquipmentMode,
  RecurrenceMode,
  TravelPolicy,
} from '@/types'

interface DraftState {
  hourly_labor_cost: string
  default_target_margin_pct: string
  default_vat_rate: string
  consumables_policy: ConsumablesPolicy
  travel_policy: TravelPolicy
  equipment_mode: EquipmentMode
  default_recurrence_mode: RecurrenceMode
  meal_allowance_threshold_hours: string
  meal_allowance_amount: string
  machine_rental_daily_cost: string
}

function settingsToDraft(s: CompanyPricingSettings | null): DraftState {
  return {
    hourly_labor_cost: s?.hourly_labor_cost?.toString() ?? '',
    default_target_margin_pct: s?.default_target_margin_pct?.toString() ?? '',
    default_vat_rate: s?.default_vat_rate?.toString() ?? '20',
    consumables_policy: s?.consumables_policy ?? 'per_quote_decision',
    travel_policy: s?.travel_policy ?? 'per_quote_decision',
    equipment_mode: s?.equipment_mode ?? 'per_quote_decision',
    default_recurrence_mode: s?.default_recurrence_mode ?? 'per_pass',
    meal_allowance_threshold_hours: s?.meal_allowance_threshold_hours?.toString() ?? '',
    meal_allowance_amount: s?.meal_allowance_amount?.toString() ?? '',
    machine_rental_daily_cost: s?.machine_rental_daily_cost?.toString() ?? '',
  }
}

function parseNumeric(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function PricingSettingsPanel() {
  const [draft, setDraft] = useState<DraftState>(() => settingsToDraft(null))
  const [loading, setLoading] = useState(true)
  const [pending, startSave] = useTransition()
  const [serviceCount, setServiceCount] = useState(0)
  const [ruleCount, setRuleCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadPricingSettings()
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setDraft(settingsToDraft(res.data.settings))
          setServiceCount(res.data.services.length)
          setRuleCount(res.data.rules.length)
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

  function update(patch: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function handleSave() {
    const payload = {
      hourly_labor_cost: parseNumeric(draft.hourly_labor_cost),
      default_target_margin_pct: parseNumeric(draft.default_target_margin_pct),
      default_vat_rate: parseNumeric(draft.default_vat_rate),
      consumables_policy: draft.consumables_policy,
      travel_policy: draft.travel_policy,
      equipment_mode: draft.equipment_mode,
      default_recurrence_mode: draft.default_recurrence_mode,
      meal_allowance_threshold_hours: parseNumeric(draft.meal_allowance_threshold_hours),
      meal_allowance_amount: parseNumeric(draft.meal_allowance_amount),
      machine_rental_daily_cost: parseNumeric(draft.machine_rental_daily_cost),
    }
    const fd = new FormData()
    fd.append('payload', JSON.stringify(payload))
    startSave(async () => {
      const res = await updatePricingSettings(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(res.message ?? 'Paramètres enregistrés.')
    })
  }

  if (loading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="py-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres de tarification</CardTitle>
          <p className="text-[12px] text-slate-500 mt-1">
            Valeurs par défaut utilisées par le moteur de devis intelligent.
            Modifiables à tout moment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px]">Taux horaire main-d&apos;œuvre (€)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={draft.hourly_labor_cost}
                onChange={(e) => update({ hourly_labor_cost: e.target.value })}
                disabled={pending}
                placeholder="ex : 25"
              />
            </div>
            <div>
              <Label className="text-[12px]">Marge cible par défaut (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={draft.default_target_margin_pct}
                onChange={(e) => update({ default_target_margin_pct: e.target.value })}
                disabled={pending}
                placeholder="ex : 35"
              />
            </div>
            <div>
              <Label className="text-[12px]">TVA par défaut (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={draft.default_vat_rate}
                onChange={(e) => update({ default_vat_rate: e.target.value })}
                disabled={pending}
                placeholder="ex : 20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px]">Politique consommables</Label>
              <Select
                value={draft.consumables_policy}
                onValueChange={(v) =>
                  update({ consumables_policy: v as ConsumablesPolicy })
                }
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONSUMABLES_POLICY_LABELS_FR) as ConsumablesPolicy[]).map(
                    (p) => (
                      <SelectItem key={p} value={p}>
                        {CONSUMABLES_POLICY_LABELS_FR[p]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Politique déplacement</Label>
              <Select
                value={draft.travel_policy}
                onValueChange={(v) => update({ travel_policy: v as TravelPolicy })}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRAVEL_POLICY_LABELS_FR) as TravelPolicy[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TRAVEL_POLICY_LABELS_FR[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Matériel</Label>
              <Select
                value={draft.equipment_mode}
                onValueChange={(v) => update({ equipment_mode: v as EquipmentMode })}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EQUIPMENT_MODE_LABELS_FR) as EquipmentMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {EQUIPMENT_MODE_LABELS_FR[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Récurrence par défaut</Label>
              <Select
                value={draft.default_recurrence_mode}
                onValueChange={(v) =>
                  update({ default_recurrence_mode: v as RecurrenceMode })
                }
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECURRENCE_MODE_LABELS_FR) as RecurrenceMode[]).map(
                    (m) => (
                      <SelectItem key={m} value={m}>
                        {RECURRENCE_MODE_LABELS_FR[m]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <details className="rounded-lg border border-slate-200 bg-slate-50/30">
            <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
              Repas mission longue + location machine
            </summary>
            <div className="px-4 pb-4 pt-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Seuil repas (heures)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={draft.meal_allowance_threshold_hours}
                    onChange={(e) =>
                      update({ meal_allowance_threshold_hours: e.target.value })
                    }
                    disabled={pending}
                    placeholder="ex : 6"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Montant repas (€/agent)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={draft.meal_allowance_amount}
                    onChange={(e) =>
                      update({ meal_allowance_amount: e.target.value })
                    }
                    disabled={pending}
                    placeholder="ex : 12"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[12px]">Location machine (€/jour)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={draft.machine_rental_daily_cost}
                    onChange={(e) =>
                      update({ machine_rental_daily_cost: e.target.value })
                    }
                    disabled={pending}
                    placeholder="ex : 60"
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={pending} className="gap-2">
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarification par prestation</CardTitle>
          <p className="text-[12px] text-slate-500 mt-1">
            {ruleCount} règle(s) configurée(s) sur {serviceCount} prestation(s) actives.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-slate-500">
            La gestion détaillée des règles par prestation (unité de calcul, prix
            de base, temps moyen, marge spécifique) est en cours d&apos;amélioration. En
            attendant, configure-les depuis l&apos;onglet « Types de services » et le wizard
            d&apos;onboarding.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
