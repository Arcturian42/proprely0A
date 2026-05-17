'use client'

import { useMemo } from 'react'
import { Mission } from '@/types'
import { useAppStore } from '@/lib/store'
import { recommendAgentsForMission } from '@/lib/scheduling'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, initials } from '@/lib/utils'
import { FATIGUE_LABEL_COLORS, FATIGUE_LABEL_TEXT } from '@/lib/constants'
import { CheckCircle2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  mission: Mission
}

export function AgentRecommendationList({ mission }: Props) {
  const { agents, missions, agentSkills, availabilityBlocks, fatigueScores, assignAgentsToMission } = useAppStore()

  const recommendations = useMemo(() =>
    recommendAgentsForMission(mission, agents, missions, agentSkills, availabilityBlocks, fatigueScores),
    [mission, agents, missions, agentSkills, availabilityBlocks, fatigueScores],
  )

  const assignedIds = new Set((mission.agents ?? []).map(a => a.id))

  const toggleAssign = (agentId: string) => {
    const next = new Set(assignedIds)
    if (next.has(agentId)) next.delete(agentId)
    else next.add(agentId)
    assignAgentsToMission(mission.id, Array.from(next))
    toast.success('Affectation mise à jour')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Agents recommandés
        </h3>
        <p className="text-xs text-slate-500">{assignedIds.size} assigné{assignedIds.size > 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-2">
        {recommendations.map(r => {
          const isAssigned = assignedIds.has(r.agent.id)
          const overloaded = r.loadRatio > 0.9
          return (
            <div
              key={r.agent.id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isAssigned ? 'border-indigo-300 bg-indigo-50/50' : r.score === 0 ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-indigo-200',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                  isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700',
                )}>
                  {initials(r.agent.first_name, r.agent.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {r.agent.first_name} {r.agent.last_name}
                    </p>
                    {r.score >= 80 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">★ Top match</Badge>}
                    {r.conflicts && <Badge variant="destructive" className="text-[10px]">Conflit</Badge>}
                    {!r.fitsSkills && <Badge className="bg-rose-100 text-rose-700 text-[10px]">Skills KO</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-slate-500">{r.agent.specialty}</span>
                    <Badge className={cn('text-[10px]', FATIGUE_LABEL_COLORS[r.fatigueLabel])}>
                      {FATIGUE_LABEL_TEXT[r.fatigueLabel]}
                    </Badge>
                    <span className={cn('text-[11px]', overloaded ? 'text-rose-600' : 'text-slate-500')}>
                      Charge {Math.round(r.loadRatio * 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        r.loadRatio > 1 ? 'bg-rose-500' : r.loadRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(100, r.loadRatio * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] uppercase text-slate-400">Score</p>
                  <p className={cn(
                    'text-lg font-bold',
                    r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-amber-600' : r.score === 0 ? 'text-slate-300' : 'text-slate-600',
                  )}>{r.score}</p>
                </div>
                <Button
                  size="sm"
                  variant={isAssigned ? 'outline' : 'default'}
                  onClick={() => toggleAssign(r.agent.id)}
                  disabled={r.score === 0 && !isAssigned}
                  className={cn('flex-shrink-0', !isAssigned && 'bg-indigo-600 hover:bg-indigo-700')}
                >
                  {isAssigned ? <><X className="w-3 h-3 mr-1" /> Retirer</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Assigner</>}
                </Button>
              </div>
            </div>
          )
        })}
        {recommendations.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400 italic">Aucun agent disponible</div>
        )}
      </div>
    </div>
  )
}
