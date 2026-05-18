import { ChevronRight } from 'lucide-react'
import { QUOTE_STATUS_LABELS } from '@/lib/constants'

// Presentational atoms shared across the QuoteFlow wizard steps.
// Extracted from QuoteFlow.tsx — pure UI, no state.

export function StepHeader({
  title,
  step,
  total,
  onBack,
}: {
  title: string
  step: number
  total: number
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="flex gap-1 mt-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

const STATUS_BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  brouillon: { bg: 'bg-slate-100', text: 'text-slate-600' },
  envoye: { bg: 'bg-orange-100', text: 'text-orange-700' },
  signe: { bg: 'bg-green-100', text: 'text-green-700' },
  refuse: { bg: 'bg-red-100', text: 'text-red-700' },
  expire: { bg: 'bg-slate-100', text: 'text-slate-400' },
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const c = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.brouillon
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}
    >
      {QUOTE_STATUS_LABELS[status] || status}
    </span>
  )
}
