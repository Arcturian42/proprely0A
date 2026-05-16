'use client'

import { useState } from 'react'
import { PipelineLead } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { ActivityType } from '@/types/pipeline'
import { MessageSquare, Phone, Mail, FileText, CheckSquare, ArrowRight, Paperclip, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabTimelineProps {
  lead: PipelineLead
}

const TYPE_CONFIG: Record<ActivityType, { icon: React.ElementType; color: string; label: string }> = {
  note: { icon: MessageSquare, color: 'bg-blue-100 text-blue-600', label: 'Note' },
  call: { icon: Phone, color: 'bg-green-100 text-green-600', label: 'Appel' },
  email: { icon: Mail, color: 'bg-violet-100 text-violet-600', label: 'Email' },
  quote: { icon: FileText, color: 'bg-orange-100 text-orange-600', label: 'Devis' },
  task: { icon: CheckSquare, color: 'bg-yellow-100 text-yellow-600', label: 'Tâche' },
  status_change: { icon: ArrowRight, color: 'bg-slate-100 text-slate-600', label: 'Statut' },
  file: { icon: Paperclip, color: 'bg-pink-100 text-pink-600', label: 'Fichier' },
  created: { icon: Star, color: 'bg-indigo-100 text-indigo-600', label: 'Créé' },
}

const ALL_TYPES: ActivityType[] = ['note', 'call', 'email', 'quote', 'task', 'status_change', 'file', 'created']

export function TabTimeline({ lead }: TabTimelineProps) {
  const activities = usePipelineStore(s => s.activities.filter(a => a.lead_id === lead.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')
  const [limit, setLimit] = useState(20)

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter)
  const visible = filtered.slice(0, limit)

  // Group by date
  const groups: Record<string, typeof visible> = {}
  for (const a of visible) {
    const day = new Date(a.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
    groups[day] = groups[day] ?? []
    groups[day].push(a)
  }

  return (
    <div className="space-y-4 p-1">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', filter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
        >
          Tout ({activities.length})
        </button>
        {ALL_TYPES.map(type => {
          const cfg = TYPE_CONFIG[type]
          const count = activities.filter(a => a.type === type).length
          if (count === 0) return null
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1',
                filter === type ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <cfg.icon className="w-3 h-3" />{cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groups).map(([day, items]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 capitalize">{day}</p>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-3">
                {items.map(activity => {
                  const cfg = TYPE_CONFIG[activity.type]
                  return (
                    <div key={activity.id} className="flex items-start gap-3 pl-0">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10', cfg.color)}>
                        <cfg.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-slate-100 p-3 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">{activity.author}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(activity.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{activity.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">Aucune activité</div>
        )}

        {filtered.length > limit && (
          <button onClick={() => setLimit(l => l + 20)} className="w-full text-xs text-blue-600 hover:underline py-2">
            Afficher plus ({filtered.length - limit} restantes)
          </button>
        )}
      </div>
    </div>
  )
}
