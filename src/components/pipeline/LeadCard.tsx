'use client'

import { PipelineLead } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { PRIORITY_CONFIG, SOURCE_CONFIG, getDaysInStage, getDaysColor } from '@/lib/pipeline-actions'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LeadCardProps {
  lead: PipelineLead
  onClick: () => void
  isDragging?: boolean
}

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const quotes = usePipelineStore(s => s.quotes.filter(q => q.lead_id === lead.id))
  const daysInStage = getDaysInStage(lead.updated_at)
  const priority = PRIORITY_CONFIG[lead.priority]
  const source = SOURCE_CONFIG[lead.source]
  const value = lead.value_monthly ?? lead.value_total ?? 0
  const isActionOverdue = lead.next_action_date && new Date(lead.next_action_date).getTime() < Date.now()

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-3 cursor-pointer select-none',
        'hover:shadow-md hover:border-slate-300 transition-all duration-150',
        isDragging && 'shadow-xl rotate-1 opacity-90',
      )}
    >
      {/* Top row: company + value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm text-slate-900 leading-tight line-clamp-2">{lead.company_name}</p>
        {value > 0 && (
          <span className="text-xs font-medium text-green-700 whitespace-nowrap shrink-0">
            {formatCurrency(value)}/m
          </span>
        )}
      </div>

      {/* Priority + source */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={cn('inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border font-medium', priority.color)}>
          {priority.icon} {priority.label}
        </span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', source.color)}>
          {source.label}
        </span>
        {quotes.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
            {quotes.length} devis
          </span>
        )}
      </div>

      {/* Contact + days in stage */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{lead.assigned_to}</span>
        </div>
        <span className={cn('font-medium', getDaysColor(daysInStage))}>
          {daysInStage}j
        </span>
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {lead.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs py-0 h-4 px-1.5 text-slate-600">{tag}</Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="outline" className="text-xs py-0 h-4 px-1.5 text-slate-400">+{lead.tags.length - 2}</Badge>
          )}
        </div>
      )}

      {/* Next action */}
      {lead.next_action_date && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs', isActionOverdue ? 'text-red-600 animate-pulse' : 'text-slate-500')}>
          <Calendar className="w-3 h-3" />
          <span>
            {isActionOverdue ? '⚠️ ' : ''}
            {new Date(lead.next_action_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            {lead.next_action_type && ` — ${lead.next_action_type}`}
          </span>
        </div>
      )}
    </div>
  )
}
