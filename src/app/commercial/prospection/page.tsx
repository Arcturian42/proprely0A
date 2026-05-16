'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { Lead, LeadStatus } from '@/types'
import {
  fetchProspects,
  ProspectCandidate,
  ProspectionFilters,
  SECTEUR_OPTIONS,
  DEPARTMENT_OPTIONS,
  SIZE_OPTIONS,
} from '@/lib/prospection-api'
import {
  Sparkles, X, Check, Building2, MapPin, Hash, Calendar, Users,
  ChevronRight, RotateCcw, AlertCircle, Loader2, Target, TrendingUp,
  ArrowLeft, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageView = 'config' | 'swiping' | 'done'

interface SessionStats {
  loaded: number
  accepted: number
  rejected: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-slate-500'
}

function scoreBg(score: number) {
  if (score >= 75) return 'bg-emerald-50 border-emerald-200'
  if (score >= 55) return 'bg-amber-50 border-amber-200'
  return 'bg-slate-50 border-slate-200'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Très pertinent'
  if (score >= 55) return 'Pertinent'
  return 'Peu pertinent'
}

function formatSiren(siren: string) {
  return siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

function formatCreationDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────

interface SwipeCardProps {
  prospect: ProspectCandidate
  onAccept: () => void
  onReject: () => void
  isTop: boolean
  stackIndex: number
}

function SwipeCard({ prospect, onAccept, onReject, isTop, stackIndex }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isDragging = useRef(false)
  const [dragDelta, setDragDelta] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)

  const triggerExit = useCallback((dir: 'left' | 'right') => {
    setIsExiting(true)
    setExitDir(dir)
    setTimeout(() => {
      if (dir === 'right') onAccept()
      else onReject()
    }, 350)
  }, [onAccept, onReject])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTop || isExiting) return
    isDragging.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    currentX.current = dx
    setDragDelta(dx)
    setDirection(dx > 0 ? 'right' : 'left')
  }

  const onPointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const dx = currentX.current
    if (Math.abs(dx) > 100) {
      triggerExit(dx > 0 ? 'right' : 'left')
    } else {
      setDragDelta(0)
      setDirection(null)
    }
  }

  const rotate = isExiting
    ? (exitDir === 'right' ? 20 : -20)
    : dragDelta * 0.08

  const translateX = isExiting
    ? (exitDir === 'right' ? 600 : -600)
    : dragDelta

  const opacity = isExiting ? 0 : 1

  const scale = isTop ? 1 : Math.max(0.92, 1 - stackIndex * 0.04)
  const translateY = isTop ? 0 : stackIndex * 10

  const showAcceptHint = isTop && direction === 'right' && Math.abs(dragDelta) > 40
  const showRejectHint = isTop && direction === 'left' && Math.abs(dragDelta) > 40

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none"
      style={{
        transform: `translateX(${translateX}px) rotate(${rotate}deg) scale(${scale}) translateY(${translateY}px)`,
        opacity,
        transition: isExiting ? 'all 0.35s ease' : isDragging.current ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        cursor: isTop ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
        zIndex: 10 - stackIndex,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative h-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Direction hints */}
        {showAcceptHint && (
          <div className="absolute top-6 left-6 z-20 rotate-[-15deg] border-4 border-emerald-500 rounded-xl px-4 py-2">
            <span className="text-emerald-600 font-black text-2xl tracking-wide">AJOUTER</span>
          </div>
        )}
        {showRejectHint && (
          <div className="absolute top-6 right-6 z-20 rotate-[15deg] border-4 border-red-400 rounded-xl px-4 py-2">
            <span className="text-red-500 font-black text-2xl tracking-wide">PASSER</span>
          </div>
        )}

        {/* AI Score band */}
        <div className={`px-6 py-3 flex items-center justify-between border-b ${scoreBg(prospect.ai_score)}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${scoreColor(prospect.ai_score)}`} />
            <span className={`text-sm font-semibold ${scoreColor(prospect.ai_score)}`}>
              Score IA {prospect.ai_score}/100
            </span>
            <span className={`text-xs ${scoreColor(prospect.ai_score)}`}>· {scoreLabel(prospect.ai_score)}</span>
          </div>
          <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${prospect.ai_score >= 75 ? 'bg-emerald-500' : prospect.ai_score >= 55 ? 'bg-amber-500' : 'bg-slate-400'}`}
              style={{ width: `${prospect.ai_score}%` }}
            />
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 flex flex-col gap-5 overflow-auto h-[calc(100%-56px)]">
          {/* Header */}
          <div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{prospect.company_name}</h2>
                {prospect.company_type && (
                  <p className="text-xs text-slate-500 mt-0.5">{prospect.company_type}</p>
                )}
              </div>
            </div>
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoChip icon={<MapPin className="w-3.5 h-3.5" />} label="Localisation" value={prospect.city} />
            <InfoChip icon={<Briefcase className="w-3.5 h-3.5" />} label="Secteur" value={prospect.sector} truncate />
            {prospect.siren && (
              <InfoChip icon={<Hash className="w-3.5 h-3.5" />} label="SIREN" value={formatSiren(prospect.siren)} mono />
            )}
            {prospect.employee_range && (
              <InfoChip icon={<Users className="w-3.5 h-3.5" />} label="Tranche salariés" value={prospect.employee_range} />
            )}
            {prospect.creation_date && (
              <InfoChip icon={<Calendar className="w-3.5 h-3.5" />} label="Création" value={formatCreationDate(prospect.creation_date)} />
            )}
            {prospect.naf_code && (
              <InfoChip icon={<Hash className="w-3.5 h-3.5" />} label="Code NAF" value={prospect.naf_code} mono />
            )}
          </div>

          {/* Address */}
          {prospect.address && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Adresse</p>
              <p className="text-sm text-slate-700">{prospect.address}</p>
            </div>
          )}

          {/* SIRET */}
          {prospect.siret && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">SIRET (établissement principal)</p>
              <p className="text-sm font-mono text-slate-700">{prospect.siret}</p>
            </div>
          )}

          {/* Swipe hint */}
          {isTop && (
            <p className="text-center text-xs text-slate-400 mt-auto pt-2">
              Glissez à droite pour ajouter · à gauche pour passer
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoChip({
  icon,
  label,
  value,
  truncate,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  truncate?: boolean
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-medium text-slate-800 ${truncate ? 'truncate' : ''} ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

// ─── Config Screen ─────────────────────────────────────────────────────────────

interface ConfigScreenProps {
  onLaunch: (filters: ProspectionFilters) => void
  isLoading: boolean
}

function ConfigScreen({ onLaunch, isLoading }: ConfigScreenProps) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('75')
  const [nafCode, setNafCode] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [count, setCount] = useState<10 | 20 | 'custom'>(10)
  const [customCount, setCustomCount] = useState('15')

  const finalCount = count === 'custom' ? Math.min(25, Math.max(1, parseInt(customCount) || 10)) : count

  const handleSubmit = () => {
    if (!query.trim() && !department) {
      toast.error('Précisez au moins un secteur ou un département')
      return
    }
    onLaunch({ query, department, naf_code: nafCode, company_size: companySize, count: finalCount })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-5 shadow-lg shadow-indigo-200">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Prospection IA</h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Définissez vos critères, laissez l&apos;IA trouver vos prospects depuis les données gouvernementales, et qualifiez-les en quelques swipes.
        </p>
      </div>

      {/* Config card */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 space-y-6">
          <Section title="Où chercher ?" icon={<MapPin className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm text-slate-600 mb-1.5 block">Mots-clés (ville, activité…)</Label>
                <Input
                  placeholder="Ex : restaurant Paris, cabinet médical Lyon…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-1.5 block">Département</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value || '__all__'}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-1.5 block">Secteur d&apos;activité</Label>
                <Select value={nafCode} onValueChange={setNafCode}>
                  <SelectTrigger><SelectValue placeholder="Tous secteurs" /></SelectTrigger>
                  <SelectContent>
                    {SECTEUR_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value || '__all__'}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <div className="border-t border-slate-100" />

          <Section title="Critères entreprise" icon={<Building2 className="w-4 h-4" />}>
            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Taille de l&apos;entreprise</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger><SelectValue placeholder="Toutes tailles" /></SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value || '__all__'}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <div className="border-t border-slate-100" />

          <Section title="Volume de prospection" icon={<Target className="w-4 h-4" />}>
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Nombre de prospects à charger</Label>
              <div className="flex gap-2">
                {([10, 20, 'custom'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setCount(v)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      count === v
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {v === 'custom' ? 'Personnalisé' : `${v} prospects`}
                  </button>
                ))}
              </div>
              {count === 'custom' && (
                <div className="mt-3">
                  <Input
                    type="number"
                    min={1}
                    max={25}
                    value={customCount}
                    onChange={e => setCustomCount(e.target.value)}
                    placeholder="Nombre (max 25)"
                  />
                  <p className="text-xs text-slate-400 mt-1">Maximum 25 prospects par session</p>
                </div>
              )}
            </div>
          </Section>

          <Button
            className="w-full h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Chargement en cours…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Lancer la prospection IA</>
            )}
          </Button>

          <p className="text-center text-xs text-slate-400">
            Données issues de l&apos;API officielle des entreprises françaises (data.gouv.fr)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Swipe Screen ─────────────────────────────────────────────────────────────

interface SwipeScreenProps {
  prospects: ProspectCandidate[]
  stats: SessionStats
  onAccept: (p: ProspectCandidate) => void
  onReject: (p: ProspectCandidate) => void
  onReset: () => void
}

function SwipeScreen({ prospects, stats, onAccept, onReject, onReset }: SwipeScreenProps) {
  const [queue, setQueue] = useState(prospects)

  const topProspect = queue[0]
  const progress = prospects.length > 0 ? ((prospects.length - queue.length) / prospects.length) * 100 : 0

  const handleAccept = useCallback(() => {
    if (!queue[0]) return
    onAccept(queue[0])
    setQueue(q => q.slice(1))
  }, [queue, onAccept])

  const handleReject = useCallback(() => {
    if (!queue[0]) return
    onReject(queue[0])
    setQueue(q => q.slice(1))
  }, [queue, onReject])

  if (queue.length === 0) {
    return <DoneScreen stats={stats} onReset={onReset} />
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress bar */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{prospects.length - queue.length} traités sur {prospects.length}</span>
          <span>{queue.length} restants</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Live mini-stats */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <Check className="w-3.5 h-3.5" /> {stats.accepted} ajoutés
        </span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <X className="w-3.5 h-3.5" /> {stats.rejected} passés
        </span>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-lg" style={{ height: '520px' }}>
        {queue.slice(0, 3).map((p, i) => (
          <SwipeCard
            key={p.id}
            prospect={p}
            onAccept={handleAccept}
            onReject={handleReject}
            isTop={i === 0}
            stackIndex={i}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={handleReject}
          className="w-14 h-14 rounded-full border-2 border-red-200 bg-white flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all shadow-sm active:scale-95"
          title="Passer (Swipe gauche)"
        >
          <X className="w-6 h-6 text-red-500" />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">ou utilisez les boutons</p>
          <button
            onClick={onReset}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Recommencer
          </button>
        </div>
        <button
          onClick={handleAccept}
          className="w-14 h-14 rounded-full border-2 border-emerald-300 bg-white flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
          title="Ajouter au CRM (Swipe droite)"
        >
          <Check className="w-6 h-6 text-emerald-600" />
        </button>
      </div>

      <div className="flex gap-8 text-xs text-slate-400">
        <span className="flex items-center gap-1"><X className="w-3 h-3" /> Passer</span>
        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Ajouter au CRM</span>
      </div>
    </div>
  )
}

// ─── Done Screen ──────────────────────────────────────────────────────────────

function DoneScreen({ stats, onReset }: { stats: SessionStats; onReset: () => void }) {
  const rate = stats.loaded > 0 ? Math.round((stats.accepted / stats.loaded) * 100) : 0

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
        <TrendingUp className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Session terminée !</h2>
      <p className="text-slate-500 mb-8">Tous vos prospects ont été traités.</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatTile label="Chargés" value={stats.loaded} color="blue" />
        <StatTile label="Ajoutés au CRM" value={stats.accepted} color="green" />
        <StatTile label="Passés" value={stats.rejected} color="red" />
      </div>

      {stats.accepted > 0 && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-6 py-4 mb-6 text-left">
          <p className="text-sm font-semibold text-indigo-800 mb-1">
            🎯 {stats.accepted} leads ajoutés avec succès
          </p>
          <p className="text-xs text-indigo-600">
            Taux d&apos;acceptation : {rate}% · Les leads sont visibles dans votre pipeline.
          </p>
        </div>
      )}

      <Button
        onClick={onReset}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full h-11"
      >
        <RotateCcw className="w-4 h-4" /> Lancer une nouvelle session
      </Button>
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'red' }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    green: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    red: 'text-red-500 bg-red-50 border-red-100',
  }
  return (
    <div className={`rounded-2xl border px-4 py-4 ${colorMap[color]}`}>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  )
}

// ─── Lead History Panel ───────────────────────────────────────────────────────

function LeadHistoryBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">
      {count} lead{count > 1 ? 's' : ''} en pipeline
    </Badge>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProspectionPage() {
  useEffect(() => { document.title = 'Prospection IA — Proprely' }, [])

  const { leads, addLead, addOpportunity } = useAppStore()
  const [view, setView] = useState<PageView>('config')
  const [isLoading, setIsLoading] = useState(false)
  const [prospects, setProspects] = useState<ProspectCandidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<SessionStats>({ loaded: 0, accepted: 0, rejected: 0 })

  const prospectionLeads = leads.filter(l => l.source === 'prospection_ia')

  const handleLaunch = async (filters: ProspectionFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const realFilters = {
        ...filters,
        department: filters.department === '__all__' ? '' : filters.department,
        naf_code: filters.naf_code === '__all__' ? '' : filters.naf_code,
        company_size: filters.company_size === '__all__' ? '' : filters.company_size,
      }
      const results = await fetchProspects(realFilters)
      if (results.length === 0) {
        toast.error('Aucun prospect trouvé avec ces critères. Essayez des filtres moins restrictifs.')
        setIsLoading(false)
        return
      }
      setProspects(results)
      setStats({ loaded: results.length, accepted: 0, rejected: 0 })
      setView('swiping')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la récupération des prospects'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = useCallback((prospect: ProspectCandidate) => {
    const now = new Date().toISOString()
    const leadId = crypto.randomUUID()
    const oppId = crypto.randomUUID()

    const newLead: Lead = {
      id: leadId,
      company_id: 'company-1',
      company_name: prospect.company_name,
      sector: prospect.sector,
      city: prospect.city,
      email: null,
      phone: null,
      website: null,
      source: 'prospection_ia',
      ai_score: prospect.ai_score,
      probable_need: null,
      status: 'nouveau' as LeadStatus,
      notes: [
        prospect.siren ? `SIREN : ${prospect.siren}` : null,
        prospect.siret ? `SIRET : ${prospect.siret}` : null,
        prospect.address ? `Adresse : ${prospect.address}` : null,
        prospect.naf_code ? `NAF : ${prospect.naf_code}` : null,
        prospect.creation_date ? `Créée le : ${prospect.creation_date}` : null,
      ].filter(Boolean).join('\n') || null,
      converted_opportunity_id: oppId,
      created_at: now,
      updated_at: now,
    }

    addLead(newLead)

    addOpportunity({
      id: oppId,
      company_id: 'company-1',
      lead_id: leadId,
      client_id: null,
      site_id: null,
      title: `Prospect IA — ${prospect.company_name}`,
      prospect_name: prospect.company_name,
      contact_name: null,
      email: null,
      phone: null,
      city: prospect.city,
      site_address: prospect.address,
      client_type: prospect.company_type,
      service_type: null,
      estimated_amount: null,
      stage: 'lead',
      next_action_date: null,
      notes: `Secteur : ${prospect.sector}\nScore IA : ${prospect.ai_score}/100\nSIREN : ${prospect.siren}`,
      status: 'active',
      converted_to_client: false,
      converted_at: null,
      created_at: now,
      updated_at: now,
    })

    setStats(s => ({ ...s, accepted: s.accepted + 1 }))
    toast.success(`${prospect.company_name} ajouté au CRM`, { duration: 2000 })
  }, [addLead, addOpportunity])

  const handleReject = useCallback((_prospect: ProspectCandidate) => {
    setStats(s => ({ ...s, rejected: s.rejected + 1 }))
  }, [])

  const handleReset = () => {
    setView('config')
    setProspects([])
    setError(null)
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#FBFBFA]">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'config' && (
              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h1 className="font-semibold text-slate-900 text-sm">Prospection IA</h1>
            </div>
            <LeadHistoryBadge count={prospectionLeads.length} />
          </div>
          {view === 'swiping' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{stats.accepted} ajoutés · {stats.rejected} passés</span>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur de chargement</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="px-6 py-8">
          {view === 'config' && (
            <ConfigScreen onLaunch={handleLaunch} isLoading={isLoading} />
          )}
          {view === 'swiping' && (
            <SwipeScreen
              prospects={prospects}
              stats={stats}
              onAccept={handleAccept}
              onReject={handleReject}
              onReset={handleReset}
            />
          )}
          {view === 'done' && (
            <DoneScreen stats={stats} onReset={handleReset} />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
