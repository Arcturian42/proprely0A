import { useRef, useState } from 'react'
import { Check, Eye, Heart, MapPin, Sparkles, X } from 'lucide-react'

import { formatCurrency } from '@/lib/utils'

import type { ProspectLead } from './ProspectingFlow'

// Tinder-like swipe deck for ProspectLeads. Drag right → accept, drag
// left → reject. The bottom action buttons mirror those gestures.
// Extracted from ProspectingFlow.tsx with the SwipeCard, Stat and
// ActionButton atoms it depends on.

interface DeckViewProps {
  lead: ProspectLead | undefined
  queue: ProspectLead[]
  accepted: number
  onAccept: (l: ProspectLead) => void
  onReject: (l: ProspectLead) => void
  onClose: () => void
}

export function DeckView({
  lead,
  queue,
  accepted,
  onAccept,
  onReject,
  onClose,
}: DeckViewProps) {
  if (!lead) return null
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          {queue.length} prospects à découvrir · {accepted} ajouté
          {accepted > 1 ? 's' : ''}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative h-[460px] mb-4">
        {queue
          .slice(0, 3)
          .reverse()
          .map((l, idx, arr) => {
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
        <ActionButton
          color="view"
          label="Voir plus"
          onClick={() =>
            window.open(
              `https://annuaire-entreprises.data.gouv.fr/entreprise/${lead.siren}`,
              '_blank',
            )
          }
        >
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
  lead,
  depth,
  draggable,
  onAccept,
  onReject,
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
  // isDragging mirrors startX.current in state so the JSX can react to it
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
      className={`absolute inset-0 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
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
                lead.confidence === 'high'
                  ? 'Élevée'
                  : lead.confidence === 'medium'
                    ? 'Moyenne'
                    : 'Faible'
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg p-2 border ${
        accent ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/70 border-slate-200'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={`text-sm font-semibold ${accent ? 'text-emerald-700' : 'text-slate-900'}`}
      >
        {value}
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  color,
  label,
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
