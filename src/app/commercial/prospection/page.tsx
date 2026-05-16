'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { Lead, LeadStatus } from '@/types'
import {
  fetchProspects, ProspectCandidate, ProspectionFilters,
  SECTEUR_OPTIONS, DEPARTMENT_OPTIONS, SIZE_OPTIONS,
  CATEGORY_CONFIG, formatBudget, formatSiren, TRANCHE_LABEL,
  LeadCategory,
} from '@/lib/prospection-api'
import {
  Sparkles, X, Check, Building2, MapPin, Hash, Calendar, Users,
  RotateCcw, AlertCircle, Loader2, Target, TrendingUp, ArrowLeft,
  Briefcase, ChevronDown, ChevronUp, Ruler, Banknote, GitBranch,
  Star, Flame, Zap,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types locaux ─────────────────────────────────────────────────────────────

type PageView = 'config' | 'swiping' | 'done'

interface SessionStats {
  loaded: number
  accepted: number
  rejected: number
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-8 text-right">{value}/{max}</span>
    </div>
  )
}

// ─── Score Breakdown Accordion ────────────────────────────────────────────────

function ScoreDetail({ score }: { score: ProspectCandidate['score'] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-indigo-500" /> Détail du scoring IA
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2.5 bg-white">
          <ScoreRow label="Effectif salariés" value={score.effectif} max={40} color="bg-blue-500" />
          <ScoreRow label="Secteur d'activité" value={score.secteur} max={30} color="bg-indigo-500" />
          <ScoreRow label="Localisation / Siège" value={score.localisation} max={15} color="bg-violet-500" />
          <ScoreRow label="Maturité / Multi-sites" value={score.maturite} max={10} color="bg-purple-500" />
          <ScoreRow
            label="Signaux détectés"
            value={score.signaux}
            max={5}
            color={score.signaux >= 0 ? 'bg-emerald-500' : 'bg-red-400'}
            allowNegative
          />
        </div>
      )}
    </div>
  )
}

function ScoreRow({ label, value, max, color, allowNegative }: {
  label: string; value: number; max: number; color: string; allowNegative?: boolean
}) {
  const displayValue = allowNegative && value < 0 ? value : value
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className={`font-semibold ${value < 0 ? 'text-red-500' : 'text-slate-700'}`}>
          {value > 0 && '+'}{displayValue} pts
        </span>
      </div>
      <ScoreBar value={Math.max(0, value)} max={max} color={color} />
    </div>
  )
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
  const currentX = useRef(0)
  const isDragging = useRef(false)
  const [dragDelta, setDragDelta] = useState(0)
  const [dragDir, setDragDir] = useState<'left' | 'right' | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)

  const triggerExit = useCallback((dir: 'left' | 'right') => {
    setIsExiting(true)
    setExitDir(dir)
    setTimeout(() => { if (dir === 'right') onAccept(); else onReject() }, 350)
  }, [onAccept, onReject])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTop || isExiting) return
    isDragging.current = true
    startX.current = e.clientX
    cardRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    currentX.current = dx
    setDragDelta(dx)
    setDragDir(dx > 0 ? 'right' : 'left')
  }
  const onPointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    if (Math.abs(currentX.current) > 100) triggerExit(currentX.current > 0 ? 'right' : 'left')
    else { setDragDelta(0); setDragDir(null) }
  }

  const cfg = CATEGORY_CONFIG[prospect.category]
  const rotate = isExiting ? (exitDir === 'right' ? 20 : -20) : dragDelta * 0.08
  const translateX = isExiting ? (exitDir === 'right' ? 700 : -700) : dragDelta
  const opacity = isExiting ? 0 : 1
  const scale = isTop ? 1 : Math.max(0.92, 1 - stackIndex * 0.04)
  const translateY = isTop ? 0 : stackIndex * 10

  const showAccept = isTop && dragDir === 'right' && Math.abs(dragDelta) > 50
  const showReject = isTop && dragDir === 'left' && Math.abs(dragDelta) > 50
  const budget = formatBudget(prospect.budget_min, prospect.budget_max)

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none"
      style={{
        transform: `translateX(${translateX}px) rotate(${rotate}deg) scale(${scale}) translateY(${translateY}px)`,
        opacity,
        transition: isExiting ? 'all 0.35s ease' : isDragging.current ? 'none' : 'transform 0.3s ease',
        cursor: isTop ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
        zIndex: 10 - stackIndex,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative h-full rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden">

        {/* Hints */}
        {showAccept && (
          <div className="absolute top-5 left-5 z-20 rotate-[-12deg] border-4 border-emerald-500 rounded-xl px-4 py-1.5">
            <span className="text-emerald-600 font-black text-xl tracking-widest">AJOUTER</span>
          </div>
        )}
        {showReject && (
          <div className="absolute top-5 right-5 z-20 rotate-[12deg] border-4 border-red-400 rounded-xl px-4 py-1.5">
            <span className="text-red-500 font-black text-xl tracking-widest">PASSER</span>
          </div>
        )}

        {/* Category + score header */}
        <div className={`px-5 py-3 flex items-center justify-between ${cfg.bg} border-b ${cfg.border}`}>
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.dot}`}
                style={{ width: `${prospect.score.total}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${cfg.color}`}>{prospect.score.total}<span className="text-xs font-normal opacity-70">/100</span></span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">

          {/* Company header */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{prospect.company_name}</h2>
              {prospect.company_type && <p className="text-xs text-slate-400 mt-0.5">{prospect.company_type}</p>}
            </div>
          </div>

          {/* Key chips */}
          <div className="grid grid-cols-2 gap-2">
            <Chip icon={<MapPin className="w-3 h-3" />} label="Ville" value={`${prospect.city}${prospect.postal_code ? ` (${prospect.postal_code})` : ''}`} />
            <Chip icon={<Briefcase className="w-3 h-3" />} label="Secteur" value={prospect.sector} truncate />
            {prospect.employee_range && (
              <Chip icon={<Users className="w-3 h-3" />} label="Effectif" value={TRANCHE_LABEL[prospect.employee_range] ?? prospect.employee_range} />
            )}
            {prospect.siren && (
              <Chip icon={<Hash className="w-3 h-3" />} label="SIREN" value={formatSiren(prospect.siren)} mono />
            )}
            {prospect.creation_date && (
              <Chip icon={<Calendar className="w-3 h-3" />} label="Création" value={new Date(prospect.creation_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })} />
            )}
            {prospect.nombre_etablissements > 1 && (
              <Chip icon={<GitBranch className="w-3 h-3" />} label="Établissements" value={`${prospect.nombre_etablissements} sites`} />
            )}
          </div>

          {/* Business estimates */}
          {(prospect.surface_estimee_m2 || budget) && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Estimation marché
              </p>
              {prospect.surface_estimee_m2 && (
                <div className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-sm text-indigo-800">
                    Surface bureaux estimée : <strong>~{prospect.surface_estimee_m2.toLocaleString('fr-FR')} m²</strong>
                  </span>
                </div>
              )}
              {budget && (
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-sm text-indigo-800">
                    Budget nettoyage estimé : <strong>{budget}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Recommendation */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-slate-400" /> Recommandation
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">{prospect.recommandation}</p>
          </div>

          {/* Score breakdown */}
          <ScoreDetail score={prospect.score} />

          {/* Address + SIRET */}
          {prospect.address && (
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Adresse : </span>{prospect.address}
            </div>
          )}
          {prospect.siret && (
            <div className="text-xs text-slate-400 font-mono">SIRET : {prospect.siret}</div>
          )}

          {isTop && (
            <p className="text-center text-xs text-slate-300 pt-1">
              ← Passer · Glissez · Ajouter au CRM →
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ icon, label, value, truncate, mono }: {
  icon: React.ReactNode; label: string; value: string | null | undefined; truncate?: boolean; mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1 text-slate-400 mb-0.5">
        {icon}<span className="text-[10px]">{label}</span>
      </div>
      <p className={`text-xs font-medium text-slate-800 leading-tight ${truncate ? 'truncate' : ''} ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

// ─── Config Screen ─────────────────────────────────────────────────────────────

function ConfigScreen({ onLaunch, isLoading }: { onLaunch: (f: ProspectionFilters) => void; isLoading: boolean }) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('75')
  const [nafCode, setNafCode] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [scoreMin, setScoreMin] = useState(30)
  const [siegeOnly, setSiegeOnly] = useState(false)
  const [count, setCount] = useState<10 | 20 | 'custom'>(10)
  const [customCount, setCustomCount] = useState('15')

  const finalCount = count === 'custom' ? Math.min(25, Math.max(1, parseInt(customCount) || 10)) : count

  const handleSubmit = () => {
    onLaunch({
      query,
      department: department === '__all__' ? '' : department,
      naf_code: nafCode === '__all__' ? '' : nafCode,
      company_size: companySize === '__all__' ? '' : companySize,
      score_min: scoreMin,
      siege_only: siegeOnly,
      count: finalCount,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-5 shadow-lg shadow-indigo-200">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Prospection IA</h1>
        <p className="text-slate-500 max-w-md mx-auto text-sm">
          Algorithme de scoring en 5 dimensions — données officielles INSEE / Sirene (data.gouv.fr)
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 space-y-7">

          {/* Localisation */}
          <ConfigSection title="Zone de prospection" icon={<MapPin className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-slate-500 mb-1.5 block">Mots-clés libres</Label>
                <Input
                  placeholder="Ex: bureau, cabinet, groupe, clinique…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <FilterSelect label="Département" value={department} onChange={setDepartment} options={DEPARTMENT_OPTIONS} />
              <FilterSelect label="Secteur NAF" value={nafCode} onChange={setNafCode} options={SECTEUR_OPTIONS} />
            </div>
          </ConfigSection>

          <Divider />

          {/* Entreprise */}
          <ConfigSection title="Critères entreprise" icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <FilterSelect label="Taille (effectif)" value={companySize} onChange={setCompanySize} options={SIZE_OPTIONS} />
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setSiegeOnly(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${siegeOnly ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${siegeOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-slate-700">Sièges sociaux uniquement</span>
                </label>
              </div>
            </div>
          </ConfigSection>

          <Divider />

          {/* Scoring filter */}
          <ConfigSection title="Score IA minimum" icon={<Target className="w-4 h-4" />}>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Exclure les leads en dessous de</span>
                <span className="font-bold text-slate-700">{scoreMin} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={scoreMin}
                onChange={e => setScoreMin(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                {(['disqualified', 'cold', 'cool', 'warm', 'hot'] as LeadCategory[]).map(cat => (
                  <span key={cat} className={CATEGORY_CONFIG[cat].color}>{CATEGORY_CONFIG[cat].label.split(' ')[1]}</span>
                ))}
              </div>
            </div>
          </ConfigSection>

          <Divider />

          {/* Volume */}
          <ConfigSection title="Volume" icon={<Flame className="w-4 h-4" />}>
            <div className="flex gap-2">
              {([10, 20, 'custom'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setCount(v)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    count === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {v === 'custom' ? 'Perso' : `${v} leads`}
                </button>
              ))}
            </div>
            {count === 'custom' && (
              <Input
                type="number" min={1} max={25}
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                placeholder="Nombre (max 25)"
                className="mt-3"
              />
            )}
          </ConfigSection>

          <Button
            className="w-full h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse des entreprises…</>
              : <><Sparkles className="w-4 h-4" /> Lancer la prospection IA</>
            }
          </Button>

          <p className="text-center text-xs text-slate-400">
            Données Sirene — INSEE · data.gouv.fr · Mise à jour mensuelle
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[]
}) {
  return (
    <div>
      <Label className="text-xs text-slate-500 mb-1.5 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value || '__all__'}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Divider() { return <div className="border-t border-slate-100" /> }

// ─── Swipe Screen ─────────────────────────────────────────────────────────────

function SwipeScreen({ prospects, stats, onAccept, onReject, onReset }: {
  prospects: ProspectCandidate[]
  stats: SessionStats
  onAccept: (p: ProspectCandidate) => void
  onReject: (p: ProspectCandidate) => void
  onReset: () => void
}) {
  const [queue, setQueue] = useState(prospects)
  const top = queue[0]
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

  if (!top) return <DoneScreen stats={stats} onReset={onReset} />

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Progress */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{prospects.length - queue.length} / {prospects.length} traités</span>
          <div className="flex gap-3">
            <span className="text-emerald-600 font-medium">{stats.accepted} ajoutés</span>
            <span className="text-slate-400">{stats.rejected} passés</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stack */}
      <div className="relative w-full max-w-lg" style={{ height: '580px' }}>
        {queue.slice(0, 3).map((p, i) => (
          <SwipeCard key={p.id} prospect={p} onAccept={handleAccept} onReject={handleReject} isTop={i === 0} stackIndex={i} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <ActionBtn onClick={handleReject} title="Passer" color="red">
          <X className="w-6 h-6 text-red-500" />
        </ActionBtn>
        <button onClick={onReset} className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600">
          Recommencer
        </button>
        <ActionBtn onClick={handleAccept} title="Ajouter au CRM" color="green">
          <Check className="w-6 h-6 text-emerald-600" />
        </ActionBtn>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, title, color, children }: {
  onClick: () => void; title: string; color: 'red' | 'green'; children: React.ReactNode
}) {
  const cls = color === 'red'
    ? 'border-red-200 hover:border-red-400 hover:bg-red-50'
    : 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50'
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-14 h-14 rounded-full border-2 bg-white flex items-center justify-center transition-all shadow-sm active:scale-95 ${cls}`}
    >
      {children}
    </button>
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
      <p className="text-slate-500 mb-8 text-sm">Tous vos prospects ont été qualifiés.</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile label="Analysés" value={stats.loaded} color="blue" />
        <StatTile label="Ajoutés CRM" value={stats.accepted} color="green" />
        <StatTile label="Passés" value={stats.rejected} color="red" />
      </div>
      {stats.accepted > 0 && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 mb-6 text-left">
          <p className="text-sm font-semibold text-indigo-800 mb-1">🎯 {stats.accepted} leads en pipeline</p>
          <p className="text-xs text-indigo-600">
            Taux de conversion : {rate}% · Leads visibles dans votre pipeline avec score IA et estimation budget.
          </p>
        </div>
      )}
      <Button onClick={onReset} className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full h-11">
        <RotateCcw className="w-4 h-4" /> Nouvelle session
      </Button>
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'red' }) {
  const cls = { blue: 'text-blue-600 bg-blue-50 border-blue-100', green: 'text-emerald-600 bg-emerald-50 border-emerald-100', red: 'text-red-500 bg-red-50 border-red-100' }[color]
  return (
    <div className={`rounded-2xl border px-4 py-4 ${cls}`}>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
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

  const aiLeadsCount = leads.filter(l => l.source === 'prospection_ia').length

  const handleLaunch = async (filters: ProspectionFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const results = await fetchProspects(filters)
      if (results.length === 0) {
        toast.error('Aucun prospect qualifié trouvé. Réduisez le score minimum ou élargissez les filtres.')
        return
      }
      setProspects(results)
      setStats({ loaded: results.length, accepted: 0, rejected: 0 })
      setView('swiping')
      toast.success(`${results.length} prospects analysés et scorés`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion à l\'API Sirene'
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

    const notes = [
      `Score IA : ${prospect.score.total}/100 (${CATEGORY_CONFIG[prospect.category].label})`,
      prospect.siren ? `SIREN : ${formatSiren(prospect.siren)}` : null,
      prospect.siret ? `SIRET : ${prospect.siret}` : null,
      prospect.address ? `Adresse : ${prospect.address}` : null,
      prospect.naf_code ? `Code NAF : ${prospect.naf_code} — ${prospect.sector}` : null,
      prospect.employee_range ? `Effectif : ${TRANCHE_LABEL[prospect.employee_range] ?? prospect.employee_range}` : null,
      prospect.surface_estimee_m2 ? `Surface estimée : ~${prospect.surface_estimee_m2} m²` : null,
      formatBudget(prospect.budget_min, prospect.budget_max) ? `Budget estimé : ${formatBudget(prospect.budget_min, prospect.budget_max)}` : null,
      prospect.recommandation,
    ].filter(Boolean).join('\n')

    const newLead: Lead = {
      id: leadId, company_id: 'company-1',
      company_name: prospect.company_name,
      sector: prospect.sector,
      city: prospect.city,
      email: null, phone: null, website: null,
      source: 'prospection_ia',
      ai_score: prospect.score.total,
      probable_need: prospect.surface_estimee_m2
        ? `Nettoyage bureaux ~${prospect.surface_estimee_m2}m²`
        : null,
      status: 'nouveau' as LeadStatus,
      notes,
      converted_opportunity_id: oppId,
      created_at: now, updated_at: now,
    }
    addLead(newLead)

    addOpportunity({
      id: oppId, company_id: 'company-1',
      lead_id: leadId, client_id: null, site_id: null,
      title: `Prospect IA — ${prospect.company_name}`,
      prospect_name: prospect.company_name,
      contact_name: null,
      email: null, phone: null,
      city: prospect.city,
      site_address: prospect.address,
      client_type: prospect.company_type,
      service_type: null,
      estimated_amount: prospect.budget_min ?? null,
      stage: 'lead',
      next_action_date: null,
      notes: `Score IA : ${prospect.score.total}/100\nSecteur : ${prospect.sector}\nSIREN : ${prospect.siren}\n${prospect.recommandation}`,
      status: 'active',
      converted_to_client: false, converted_at: null,
      created_at: now, updated_at: now,
    })

    setStats(s => ({ ...s, accepted: s.accepted + 1 }))
    toast.success(`${prospect.company_name} → pipeline`, { duration: 2000 })
  }, [addLead, addOpportunity])

  const handleReject = useCallback(() => {
    setStats(s => ({ ...s, rejected: s.rejected + 1 }))
  }, [])

  const handleReset = () => { setView('config'); setProspects([]); setError(null) }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#FBFBFA]">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'config' && (
              <button onClick={handleReset} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-900 text-sm">Prospection IA</span>
            {aiLeadsCount > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {aiLeadsCount} lead{aiLeadsCount > 1 ? 's' : ''} en pipeline
              </span>
            )}
          </div>
          {view === 'swiping' && (
            <span className="text-xs text-slate-400">{stats.accepted} ajoutés · {stats.rejected} passés</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Erreur API Sirene</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        <div className="px-6 py-8">
          {view === 'config' && <ConfigScreen onLaunch={handleLaunch} isLoading={isLoading} />}
          {view === 'swiping' && (
            <SwipeScreen
              prospects={prospects}
              stats={stats}
              onAccept={handleAccept}
              onReject={handleReject}
              onReset={handleReset}
            />
          )}
          {view === 'done' && <DoneScreen stats={stats} onReset={handleReset} />}
        </div>
      </div>
    </AdminLayout>
  )
}
