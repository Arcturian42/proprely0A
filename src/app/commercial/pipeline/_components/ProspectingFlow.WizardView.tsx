import { ArrowLeft, ArrowRight, Sparkles, Wand2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  CATEGORIES,
  QUALITIES,
  SIZES,
  SURFACES,
  type Filters,
} from './ProspectingFlow.constants'

// Wizard view of the prospecting flow — 5 sequential filter steps before
// firing the SIRENE API search. Extracted from ProspectingFlow.tsx.

interface Props {
  step: number
  totalSteps: number
  steps: Array<{ key: string; title: string; icon: React.ElementType }>
  filters: Filters
  setFilters: (f: Filters) => void
  error: string | null
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
  onClose: () => void
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm rounded-xl border px-3 py-2 transition ${
        active
          ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-900 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 bg-white/60 text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export function WizardView({
  step,
  totalSteps,
  steps,
  filters,
  setFilters,
  error,
  onNext,
  onBack,
  onSubmit,
  onClose,
}: Props) {
  const current = steps[step]
  const Icon = current.icon
  const isLast = step === totalSteps - 1
  const canNext =
    current.key === 'location' ? filters.locationValue.trim().length > 0 : true

  return (
    <div className="p-7 text-slate-900">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          AI Prospecting · Étape {step + 1}/{totalSteps}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-6">
        <div className="h-1 w-full bg-slate-200/70 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-200/60 flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
      </div>

      <div className="min-h-[200px] animate-fade-up">
        {current.key === 'category' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                active={filters.category === c.value}
                onClick={() => setFilters({ ...filters, category: c.value })}
              >
                <span className="mr-1.5">{c.emoji}</span>
                {c.label}
              </Chip>
            ))}
          </div>
        )}
        {current.key === 'size' && (
          <div className="grid grid-cols-2 gap-2">
            {SIZES.map((s) => (
              <Chip
                key={s.value}
                active={filters.size === s.value}
                onClick={() => setFilters({ ...filters, size: s.value })}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        )}
        {current.key === 'surface' && (
          <div className="grid grid-cols-2 gap-2">
            {SURFACES.map((s) => (
              <Chip
                key={s.value}
                active={filters.surface === s.value}
                onClick={() => setFilters({ ...filters, surface: s.value })}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        )}
        {current.key === 'location' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['postcode', 'departement', 'city'] as const).map((t) => (
                <Chip
                  key={t}
                  active={filters.locationType === t}
                  onClick={() => setFilters({ ...filters, locationType: t })}
                >
                  {t === 'postcode'
                    ? 'Code postal'
                    : t === 'departement'
                      ? 'Département'
                      : 'Ville'}
                </Chip>
              ))}
            </div>
            <div>
              <Label className="text-xs text-slate-500">
                {filters.locationType === 'postcode'
                  ? 'Code postal (5 chiffres)'
                  : filters.locationType === 'departement'
                    ? 'Numéro de département (ex: 75)'
                    : 'Nom de ville'}
              </Label>
              <Input
                autoFocus
                value={filters.locationValue}
                onChange={(e) => setFilters({ ...filters, locationValue: e.target.value })}
                placeholder={
                  filters.locationType === 'postcode'
                    ? '75008'
                    : filters.locationType === 'departement'
                      ? '75'
                      : 'Paris'
                }
                className="bg-white/70 backdrop-blur border-slate-200"
              />
            </div>
          </div>
        )}
        {current.key === 'quality' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUALITIES.map((q) => (
              <button
                key={q.value}
                onClick={() => setFilters({ ...filters, quality: q.value })}
                className={`text-left rounded-xl border p-3 transition ${
                  filters.quality === q.value
                    ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white/60'
                }`}
              >
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{q.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={step === 0} className="gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Button>
        {!isLast ? (
          <Button onClick={onNext} disabled={!canNext} className="gap-1 bg-slate-900 hover:bg-slate-800">
            Continuer <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!canNext}
            className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/20"
          >
            <Wand2 className="w-4 h-4" /> Lancer la recherche IA
          </Button>
        )}
      </div>
    </div>
  )
}
