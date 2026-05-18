'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sparkles, ArrowRight, ArrowLeft, X, Heart, Eye, Loader2,
  Building2, Users, MapPin, Gauge, Trophy, Wand2, Check,
} from 'lucide-react'

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
  CATEGORIES,
  DEFAULT_FILTERS,
  QUALITIES,
  SIZES,
  SURFACES,
  type Filters,
  type Phase,
} from './ProspectingFlow.constants'
import { leadToOpportunity } from './ProspectingFlow.shared'

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

function WizardView({
  step, totalSteps, steps, filters, setFilters, error, onNext, onBack, onSubmit, onClose,
}: {
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
}) {
  const current = steps[step]
  const Icon = current.icon
  const isLast = step === totalSteps - 1
  const canNext =
    (current.key === 'location' ? filters.locationValue.trim().length > 0 : true)

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
                  {t === 'postcode' ? 'Code postal' : t === 'departement' ? 'Département' : 'Ville'}
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

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function SearchingView({ filters }: { filters: Filters }) {
  return (
    <div className="p-12 flex flex-col items-center text-center text-slate-800">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Sparkles className="w-9 h-9 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-400/30 to-indigo-400/30 blur-2xl animate-pulse" />
      </div>
      <h2 className="text-xl font-semibold mb-2">L&apos;IA cherche vos prospects…</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        Analyse de la base SIRENE, scoring des opportunités et estimation du potentiel contractuel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-500">
        <Tag>API gouv · recherche-entreprises</Tag>
        <Tag>Scoring IA</Tag>
        <Tag>Estimation surface</Tag>
        <Tag>Valeur contrat</Tag>
      </div>
      <div className="mt-6">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
      </div>
      <div className="sr-only">{JSON.stringify(filters)}</div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white/70 backdrop-blur border border-slate-200">
      {children}
    </span>
  )
}

function DeckView({
  lead, queue, accepted, onAccept, onReject, onClose,
}: {
  lead: ProspectLead | undefined
  queue: ProspectLead[]
  accepted: number
  onAccept: (l: ProspectLead) => void
  onReject: (l: ProspectLead) => void
  onClose: () => void
}) {
  if (!lead) return null
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          {queue.length} prospects à découvrir · {accepted} ajouté{accepted > 1 ? 's' : ''}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative h-[460px] mb-4">
        {queue.slice(0, 3).reverse().map((l, idx, arr) => {
          const depth = arr.length - 1 - idx
          const isTop = depth === 0
          return (
            <SwipeCard
              key={l.id}
              lead={l}
              depth={depth}
              draggable={isTop}
              onAccept={() => onAccept(l)}
              onReject={() => onReject(l)}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <ActionButton color="reject" onClick={() => onReject(lead)} label="Ignorer">
          <X className="w-5 h-5" />
        </ActionButton>
        <ActionButton color="view" label="Voir plus" onClick={() => window.open(`https://annuaire-entreprises.data.gouv.fr/entreprise/${lead.siren}`, '_blank')}>
          <Eye className="w-5 h-5" />
        </ActionButton>
        <ActionButton color="accept" onClick={() => onAccept(lead)} label="Ajouter">
          <Heart className="w-5 h-5" />
        </ActionButton>
      </div>
    </div>
  )
}

function SwipeCard({
  lead, depth, draggable, onAccept, onReject,
}: {
  lead: ProspectLead
  depth: number
  draggable: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dx, setDx] = useState(0)
  const [flying, setFlying] = useState<'left' | 'right' | null>(null)
  // `isDragging` mirrors startX.current in state so the JSX can react to it
  // without reading a ref during render (forbidden in concurrent React).
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable) return
    startX.current = e.clientX
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return
    setDx(e.clientX - startX.current)
  }
  const onPointerUp = () => {
    if (startX.current === null) return
    startX.current = null
    setIsDragging(false)
    if (dx > 120) {
      setFlying('right')
      setTimeout(onAccept, 220)
    } else if (dx < -120) {
      setFlying('left')
      setTimeout(onReject, 220)
    } else {
      setDx(0)
    }
  }

  const rotate = dx * 0.06
  const opacity = depth === 0 ? 1 : 1 - depth * 0.08
  const scale = 1 - depth * 0.04
  const ty = depth * 12
  const baseTransform = `translate3d(${dx}px, ${ty}px, 0) rotate(${rotate}deg) scale(${scale})`
  const flyingTransform =
    flying === 'right'
      ? `translate3d(800px, ${ty}px, 0) rotate(20deg)`
      : flying === 'left'
      ? `translate3d(-800px, ${ty}px, 0) rotate(-20deg)`
      : baseTransform

  const acceptHint = Math.min(1, Math.max(0, dx / 120))
  const rejectHint = Math.min(1, Math.max(0, -dx / 120))

  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
      style={{
        transform: flyingTransform,
        opacity,
        zIndex: 10 - depth,
        transition: isDragging
          ? 'none'
          : 'transform 280ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 280ms ease',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="prospect-card relative h-full w-full rounded-2xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-xl overflow-hidden">
        {/* Accept/reject ribbons */}
        <div
          className="absolute top-6 left-6 z-10 px-3 py-1 rounded-md border-2 border-red-500 text-red-500 font-bold text-sm rotate-[-12deg] transition-opacity"
          style={{ opacity: rejectHint }}
        >
          IGNORER
        </div>
        <div
          className="absolute top-6 right-6 z-10 px-3 py-1 rounded-md border-2 border-emerald-500 text-emerald-500 font-bold text-sm rotate-[12deg] transition-opacity"
          style={{ opacity: acceptHint }}
        >
          AJOUTER
        </div>

        {/* AI score badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
          <Sparkles className="w-3 h-3" />
          {lead.aiScore}/100
        </div>

        <div className="p-6 pt-5 flex flex-col h-full">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 font-semibold text-lg flex-shrink-0">
              {lead.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-slate-900 truncate pr-16">
                {lead.name}
              </h3>
              {lead.sector && (
                <p className="text-xs text-slate-500 truncate">{lead.sector}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="Effectif" value={lead.employees > 0 ? `${lead.employees}` : '—'} />
            <Stat label="Surface est." value={`${lead.estimatedSurface} m²`} />
            <Stat
              label="Valeur / mois"
              value={formatCurrency(lead.estimatedMonthlyValue)}
              accent
            />
            <Stat
              label="Confiance"
              value={
                lead.confidence === 'high' ? 'Élevée' :
                lead.confidence === 'medium' ? 'Moyenne' : 'Faible'
              }
            />
          </div>

          {lead.city && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {lead.address || `${lead.postcode || ''} ${lead.city}`}
            </div>
          )}

          <div className="flex-1 bg-gradient-to-br from-violet-50/60 to-indigo-50/60 border border-violet-100 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-violet-600 font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Pourquoi ce lead
            </div>
            <ul className="space-y-1">
              {lead.reasons.map((r, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-violet-500 mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-2 border ${accent ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

function ActionButton({
  children, onClick, color, label,
}: {
  children: React.ReactNode
  onClick: () => void
  color: 'reject' | 'accept' | 'view'
  label: string
}) {
  const cls =
    color === 'accept'
      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50'
      : color === 'reject'
      ? 'bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-md'
      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-md'
  const size = color === 'view' ? 'w-11 h-11' : 'w-14 h-14'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${size} rounded-full flex items-center justify-center transition-transform active:scale-95 hover:-translate-y-0.5 ${cls}`}
    >
      {children}
    </button>
  )
}

function DoneView({
  accepted, onAgain, onClose,
}: { accepted: number; onAgain: () => void; onClose: () => void }) {
  return (
    <div className="p-12 text-center text-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold mb-1">Session terminée</h2>
      <p className="text-sm text-slate-500 mb-6">
        {accepted > 0
          ? `${accepted} prospect${accepted > 1 ? 's' : ''} ajouté${accepted > 1 ? 's' : ''} au pipeline en étape "Ouvert".`
          : 'Aucun prospect ajouté cette fois-ci.'}
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onClose}>Fermer</Button>
        <Button
          onClick={onAgain}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Nouvelle recherche
        </Button>
      </div>
    </div>
  )
}
