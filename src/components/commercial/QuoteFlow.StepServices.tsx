import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, ChevronUp, X } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { SERVICE_CATEGORY_LABELS } from '@/lib/constants'
import type { ServiceCategory } from '@/types'

import {
  COMPLEXITY_LABELS,
  FREQUENCY_OPTIONS,
  SERVICE_ICONS,
  SERVICE_PILL_ORDER,
  STEP_TITLES,
} from './QuoteFlow.constants'
import { StepHeader } from './QuoteFlow.shared'
import type { ServiceLine } from './QuoteFlow.types'

// Step 1 — service picker + per-service expandable detail card.
// Extracted from QuoteFlow.tsx for readability.

const PILL_LABELS: Record<ServiceCategory, string> = {
  bureaux_recurrent: 'Bureaux',
  vitres: 'Vitres',
  terrasse: 'Terrasse',
  sols_mecanises: 'Sols',
  fin_chantier: 'Fin chantier',
  moquette: 'Moquette',
  autre: '+ Autre',
}

interface Props {
  services: ServiceLine[]
  expandedService: string | null
  onToggleExpand: (id: string) => void
  onAddService: (cat: ServiceCategory) => void
  onRemoveService: (id: string) => void
  onUpdateField: <K extends keyof ServiceLine>(
    id: string,
    field: K,
    value: ServiceLine[K],
  ) => void
  onBack: () => void
  onNext: () => void
}

export function StepServices({
  services,
  expandedService,
  onToggleExpand,
  onAddService,
  onRemoveService,
  onUpdateField,
  onBack,
  onNext,
}: Props) {
  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[1]} step={1} total={5} onBack={onBack} />

      {/* Service pills */}
      <div>
        <p className="text-xs text-slate-500 mb-2.5 font-medium">Sélectionner les services :</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_PILL_ORDER.map((cat) => {
            const alreadyAdded = services.some((s) => s.category === cat)
            return (
              <button
                key={cat}
                onClick={() => onAddService(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  alreadyAdded
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {SERVICE_ICONS[cat]}
                {PILL_LABELS[cat]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected service cards */}
      <AnimatePresence>
        {services.map((svc) => (
          <motion.div
            key={svc.id}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
          >
            {/* Card header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              onClick={() => onToggleExpand(svc.id)}
            >
              <span className="text-slate-600">{SERVICE_ICONS[svc.category]}</span>
              <span className="flex-1 text-sm font-semibold text-slate-900">
                {SERVICE_CATEGORY_LABELS[svc.category]}
              </span>
              {svc.surface && <span className="text-xs text-slate-500">{svc.surface} m²</span>}
              {expandedService === svc.id ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveService(svc.id)
                }}
                className="text-slate-300 hover:text-red-400 transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </button>

            {/* Card body */}
            <AnimatePresence>
              {expandedService === svc.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">
                          Surface (m²) *
                        </Label>
                        <Input
                          type="number"
                          placeholder="Ex: 350"
                          value={svc.surface}
                          onChange={(e) => onUpdateField(svc.id, 'surface', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Complexité</Label>
                        <Select
                          value={svc.complexity}
                          onValueChange={(v) =>
                            onUpdateField(svc.id, 'complexity', v as ServiceLine['complexity'])
                          }
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(COMPLEXITY_LABELS) as (keyof typeof COMPLEXITY_LABELS)[]).map(
                              (k) => (
                                <SelectItem key={k} value={k}>
                                  {COMPLEXITY_LABELS[k]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1.5 block">Fréquence</Label>
                      <Select
                        value={svc.frequency}
                        onValueChange={(v) => onUpdateField(svc.id, 'frequency', v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1.5 block">
                        Notes spécifiques
                      </Label>
                      <Textarea
                        placeholder="Exigences particulières pour ce service..."
                        value={svc.notes}
                        onChange={(e) => onUpdateField(svc.id, 'notes', e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {services.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
          Cliquez sur un service ci-dessus pour l&apos;ajouter
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={services.length === 0}
        className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
      >
        Continuer <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
    </div>
  )
}
