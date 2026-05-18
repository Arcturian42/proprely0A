'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { track } from '@/lib/analytics/posthog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { StepCard } from './StepCard'
import { DEFAULT_SERVICES } from '@/lib/onboarding/defaults'
import { setServices, skipServices } from '@/app/actions/onboarding'

interface CustomService {
  id: string
  name: string
  description: string
}

function newCustom(): CustomService {
  return { id: crypto.randomUUID(), name: '', description: '' }
}

export function Step3Services() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(DEFAULT_SERVICES.map((s) => s.key)),
  )
  const [customs, setCustoms] = useState<CustomService[]>([])
  const [pendingSave, startSave] = useTransition()
  const [pendingSkip, startSkip] = useTransition()

  function toggleDefault(key: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateCustom(id: string, patch: Partial<CustomService>) {
    setCustoms((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addCustom() {
    setCustoms((cs) => [...cs, newCustom()])
  }

  function removeCustom(id: string) {
    setCustoms((cs) => cs.filter((c) => c.id !== id))
  }

  function handleSave() {
    const services: { name: string; description: string | null; is_default: boolean; sort_order: number }[] = []

    for (const def of DEFAULT_SERVICES) {
      if (selected.has(def.key)) {
        services.push({
          name: def.name,
          description: def.description,
          is_default: true,
          sort_order: def.sort_order,
        })
      }
    }

    for (const c of customs) {
      const name = c.name.trim()
      if (!name) continue
      services.push({
        name,
        description: c.description.trim() || null,
        is_default: false,
        sort_order: 1000,
      })
    }

    if (services.length === 0) {
      toast.error('Sélectionne au moins une prestation, ou clique sur « Configurer plus tard ».')
      return
    }

    const fd = new FormData()
    fd.append('payload', JSON.stringify({ services }))
    startSave(async () => {
      const res = await setServices(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_completed', { step: 3, action: 'set_services', count: services.length })
      toast.success(res.message ?? 'Prestations enregistrées.')
      router.push('/onboarding/4')
    })
  }

  function handleSkip() {
    startSkip(async () => {
      const res = await skipServices()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      // skipServices skipa aussi l'étape 4 automatiquement
      track('onboarding_step_skipped', { step: 3, auto_skipped_step: 4 })
      router.push('/onboarding/5')
    })
  }

  const isBusy = pendingSave || pendingSkip

  return (
    <StepCard
      title="Quelles prestations proposes-tu ?"
      description="Ces informations permettront à Proprely de configurer ton moteur de devis intelligent."
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
              'Continuer'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <h3 className="text-[13px] font-medium text-slate-700">Prestations standard</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_SERVICES.map((s) => {
            const checked = selected.has(s.key)
            return (
              <label
                key={s.key}
                className={[
                  'flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                  checked
                    ? 'border-indigo-300 bg-indigo-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleDefault(s.key)}
                  disabled={isBusy}
                  className="mt-0.5"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900">{s.name}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {s.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h3 className="text-[13px] font-medium text-slate-700 mb-2">
          Tu proposes d&apos;autres prestations ?
        </h3>
        <div className="space-y-2">
          {customs.map((c, idx) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">
                  Prestation personnalisée {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  disabled={isBusy}
                  className="text-slate-400 hover:text-rose-500"
                  aria-label="Supprimer cette prestation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <Label htmlFor={`name-${c.id}`} className="text-[12px]">
                  Nom de la prestation <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id={`name-${c.id}`}
                  value={c.name}
                  onChange={(e) => updateCustom(c.id, { name: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor={`desc-${c.id}`} className="text-[12px]">Description courte</Label>
                <Textarea
                  id={`desc-${c.id}`}
                  value={c.description}
                  onChange={(e) => updateCustom(c.id, { description: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCustom}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 text-[13px] text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter une prestation
          </button>
        </div>
      </div>
    </StepCard>
  )
}
