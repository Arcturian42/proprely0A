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
  CONSUMABLES_POLICY_LABELS_FR,
  EQUIPMENT_MODE_LABELS_FR,
  RECURRENCE_MODE_LABELS_FR,
  TRAVEL_POLICY_LABELS_FR,
} from '@/lib/onboarding/defaults'
import { setPricingSettings, skipSettings } from '@/app/actions/onboarding'
import type {
  ConsumablesPolicy,
  EquipmentMode,
  RecurrenceMode,
  TravelPolicy,
} from '@/types'

interface SettingsDraft {
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

function parseNumeric(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const VAT_PRESETS = ['20', '10', '5.5', '0']

export function Step5PricingSettings() {
  const router = useRouter()
  const [draft, setDraft] = useState<SettingsDraft>({
    hourly_labor_cost: '',
    default_target_margin_pct: '',
    default_vat_rate: '20',
    consumables_policy: 'per_quote_decision',
    travel_policy: 'per_quote_decision',
    equipment_mode: 'per_quote_decision',
    default_recurrence_mode: 'per_pass',
    meal_allowance_threshold_hours: '',
    meal_allowance_amount: '',
    machine_rental_daily_cost: '',
  })
  const [pendingSave, startSave] = useTransition()
  const [pendingSkip, startSkip] = useTransition()
  const isBusy = pendingSave || pendingSkip

  function update(patch: Partial<SettingsDraft>) {
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
      const res = await setPricingSettings(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_completed', { step: 5, action: 'set_pricing_settings' })
      toast.success('Paramètres enregistrés.')
      router.push('/onboarding/6')
    })
  }

  function handleSkip() {
    startSkip(async () => {
      const res = await skipSettings()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_skipped', { step: 5 })
      router.push('/onboarding/6')
    })
  }

  return (
    <StepCard
      title="Paramètres de calcul"
      description="Ces paramètres seront utilisés par défaut dans tes devis. Tu pourras les modifier plus tard."
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
              'Enregistrer'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <Label className="text-[12px]">Taux horaire moyen de main-d&apos;œuvre (€)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.hourly_labor_cost}
            onChange={(e) => update({ hourly_labor_cost: e.target.value })}
            disabled={isBusy}
            className="mt-1"
            placeholder="ex : 25"
          />
        </div>

        <div>
          <Label className="text-[12px]">Marge cible (%)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.default_target_margin_pct}
            onChange={(e) => update({ default_target_margin_pct: e.target.value })}
            disabled={isBusy}
            className="mt-1"
            placeholder="ex : 35"
          />
        </div>

        <div>
          <Label className="text-[12px]">Taux de TVA par défaut (%)</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {VAT_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => update({ default_vat_rate: v })}
                disabled={isBusy}
                className={[
                  'rounded-full border px-3 py-1 text-[12px] transition-colors',
                  draft.default_vat_rate === v
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                {v}%
              </button>
            ))}
            <Input
              type="text"
              inputMode="decimal"
              value={draft.default_vat_rate}
              onChange={(e) => update({ default_vat_rate: e.target.value })}
              disabled={isBusy}
              className="w-24"
              placeholder="Autre"
            />
          </div>
        </div>

        <div>
          <Label className="text-[12px]">Consommables dans tes devis</Label>
          <Select
            value={draft.consumables_policy}
            onValueChange={(v) => update({ consumables_policy: v as ConsumablesPolicy })}
            disabled={isBusy}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CONSUMABLES_POLICY_LABELS_FR) as ConsumablesPolicy[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {CONSUMABLES_POLICY_LABELS_FR[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[12px]">Frais de déplacement</Label>
          <Select
            value={draft.travel_policy}
            onValueChange={(v) => update({ travel_policy: v as TravelPolicy })}
            disabled={isBusy}
          >
            <SelectTrigger className="mt-1">
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
            disabled={isBusy}
          >
            <SelectTrigger className="mt-1">
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
          <Label className="text-[12px]">Pour les prestations récurrentes, calculer</Label>
          <Select
            value={draft.default_recurrence_mode}
            onValueChange={(v) => update({ default_recurrence_mode: v as RecurrenceMode })}
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

        <details className="rounded-lg border border-slate-200 bg-slate-50/30">
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
            Paramètres avancés (facultatifs)
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="text-[11px] text-slate-500 leading-snug">
              Ces valeurs serviront au futur moteur de devis intelligent pour calculer
              automatiquement les frais de repas sur missions longues et la location de
              machines additionnelles. Tu peux les laisser vides pour l&apos;instant.
            </p>
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
                  disabled={isBusy}
                  className="mt-1"
                  placeholder="ex : 6"
                />
              </div>
              <div>
                <Label className="text-[12px]">Montant repas (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={draft.meal_allowance_amount}
                  onChange={(e) => update({ meal_allowance_amount: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  placeholder="ex : 12"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[12px]">Location machine (€/jour)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={draft.machine_rental_daily_cost}
                  onChange={(e) => update({ machine_rental_daily_cost: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  placeholder="ex : 60"
                />
              </div>
            </div>
          </div>
        </details>
      </div>
    </StepCard>
  )
}
