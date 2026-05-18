'use client'

import { useCallback, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import { toast } from 'sonner'
import { Sparkles, Building2, Users, MapPin, Gauge, Trophy } from 'lucide-react'

export interface ProspectLead {
  id: string
  siren: string
  siret: string | null
  name: string
  sector: string | null
  naf: string | null
  city: string | null
  postcode: string | null
  address: string | null
  employees: number
  estimatedSurface: number
  estimatedMonthlyValue: number
  estimatedYearlyValue: number
  aiScore: number
  confidence: 'high' | 'medium' | 'low'
  createdAt: string | null
  ageYears: number | null
  website: string | null
  rating: number | null
  reasons: string[]
}

import {
  DEFAULT_FILTERS,
  type Filters,
  type Phase,
} from './ProspectingFlow.constants'
import { leadToOpportunity } from './ProspectingFlow.shared'
import { WizardView } from './ProspectingFlow.WizardView'
import { DeckView } from './ProspectingFlow.DeckView'
import { SearchingView, DoneView } from './ProspectingFlow.PhaseViews'

export function ProspectingFlow() {
  const { opportunities, addOpportunity } = useAppStore()
  const companyId = useCurrentCompanyId()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('wizard')
  const [step, setStep] = useState(0)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [deck, setDeck] = useState<ProspectLead[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [accepted, setAccepted] = useState(0)
  const [fetchPage, setFetchPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Existing pipeline names — used to skip duplicates in incoming results.
  const knownNames = useMemo(
    () => new Set(opportunities.map((o) => o.prospect_name.trim().toLowerCase())),
    [opportunities],
  )

  const reset = useCallback(() => {
    setPhase('wizard')
    setStep(0)
    setDeck([])
    setExcluded(new Set())
    setAccepted(0)
    setFetchPage(1)
    setError(null)
  }, [])

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) setTimeout(reset, 300)
  }

  const fetchBatch = useCallback(
    async (excludeIds: string[], page: number): Promise<ProspectLead[]> => {
      const res = await fetch('/api/prospecting/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: filters.category,
          size: filters.size,
          surface: filters.surface,
          location: { type: filters.locationType, value: filters.locationValue },
          quality: filters.quality,
          page,
          exclude: excludeIds,
          limit: 8,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { leads: ProspectLead[]; error?: string }
      if (json.error) throw new Error(json.error)
      // Drop leads whose company name already matches an existing pipeline entry.
      return json.leads.filter((l) => !knownNames.has(l.name.trim().toLowerCase()))
    },
    [filters, knownNames],
  )

  const runSearch = async () => {
    setPhase('searching')
    setError(null)
    try {
      const initial = await fetchBatch([], 1)
      if (initial.length === 0) {
        setError('Aucun prospect trouvé. Essayez d\'élargir vos critères.')
        setPhase('wizard')
        return
      }
      setDeck(initial.slice(0, 5))
      setExcluded(new Set(initial.map((l) => l.id)))
      setFetchPage(2)
      setPhase('deck')
    } catch (e) {
      setError((e as Error).message || 'Erreur réseau')
      setPhase('wizard')
    }
  }

  const replenishIfNeeded = useCallback(
    async (currentDeck: ProspectLead[], currentExcluded: Set<string>) => {
      if (currentDeck.length > 2) return
      try {
        const more = await fetchBatch(Array.from(currentExcluded), fetchPage)
        if (more.length === 0) return
        setDeck((d) => [...d, ...more.slice(0, 5 - d.length + 3)])
        setExcluded((s) => {
          const n = new Set(s)
          more.forEach((l) => n.add(l.id))
          return n
        })
        setFetchPage((p) => p + 1)
      } catch {
        // Silent — user keeps swiping what they have.
      }
    },
    [fetchBatch, fetchPage],
  )

  const consume = (lead: ProspectLead, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      addOpportunity(leadToOpportunity(lead, companyId))
      setAccepted((n) => n + 1)
      toast.success(`${lead.name} ajouté au pipeline`)
    }
    setDeck((d) => {
      const next = d.filter((l) => l.id !== lead.id)
      replenishIfNeeded(next, excluded)
      if (next.length === 0) setPhase('done')
      return next
    })
  }

  const wizardSteps = [
    { key: 'category', title: 'Quel type d\'activité ciblez-vous ?', icon: Building2 },
    { key: 'size', title: 'Quelle taille de société ?', icon: Users },
    { key: 'surface', title: 'Surface estimée à entretenir ?', icon: Gauge },
    { key: 'location', title: 'Où prospecter ?', icon: MapPin },
    { key: 'quality', title: 'Quel profil de prospect ?', icon: Trophy },
  ]
  const totalSteps = wizardSteps.length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="prospect-cta group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
      >
        <Sparkles className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Trouver de nouveaux prospects</span>
        <span className="prospect-cta-glow" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
          <div className="prospect-shell relative rounded-2xl overflow-hidden">
            {phase === 'wizard' && (
              <WizardView
                step={step}
                totalSteps={totalSteps}
                steps={wizardSteps}
                filters={filters}
                setFilters={setFilters}
                error={error}
                onNext={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                onBack={() => setStep((s) => Math.max(0, s - 1))}
                onSubmit={runSearch}
                onClose={() => handleOpenChange(false)}
              />
            )}
            {phase === 'searching' && <SearchingView filters={filters} />}
            {phase === 'deck' && (
              <DeckView
                lead={deck[0]}
                queue={deck}
                accepted={accepted}
                onAccept={(l) => consume(l, 'accept')}
                onReject={(l) => consume(l, 'reject')}
                onClose={() => handleOpenChange(false)}
              />
            )}
            {phase === 'done' && (
              <DoneView
                accepted={accepted}
                onAgain={reset}
                onClose={() => handleOpenChange(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
