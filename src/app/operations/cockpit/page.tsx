'use client'

import { useState, useMemo, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { Mission, OperationalMissionStatus } from '@/types'
import { cn, getOperationalStatus } from '@/lib/utils'
import {
  OPERATIONAL_MISSION_STATUS_ORDER,
  OPERATIONAL_MISSION_STATUS_LABELS,
  OPERATIONAL_MISSION_STATUS_COLORS,
} from '@/lib/constants'
import { MissionCard } from './_components/MissionCard'
import { MissionDetailPanel } from './_components/MissionDetailPanel'
import {
  Search, Sparkles, AlertTriangle, Clock, TrendingUp,
  ListChecks, Wand2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function CockpitPage() {
  useEffect(() => { document.title = 'Cockpit — Proprely' }, [])

  const { missions, agents, opportunities, signOpportunityContract, updateMissionOperationalStatus } = useAppStore()

  const [search, setSearch] = useState('')
  const [filterClient] = useState<string>('all')
  const [filterUrgency, setFilterUrgency] = useState<string>('all')
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const [draggedMissionId, setDraggedMissionId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<OperationalMissionStatus | null>(null)

  // Opportunités gagnées non encore matérialisées en mission "à organiser"
  const winnableOpportunities = opportunities.filter(o => {
    if (o.stage !== 'gagne') return false
    // Cache une opp qui a déjà donné lieu à une mission "à organiser" via ce flux
    const alreadyOrganizing = missions.some(m =>
      m.client_id === o.client_id
      && getOperationalStatus(m) === 'a_organiser'
      && (m.contact_phone === o.phone || m.contact_name === o.contact_name),
    )
    return !alreadyOrganizing
  })

  const filtered = useMemo(() => {
    return missions.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        const matches = (m.client?.name?.toLowerCase().includes(q))
          || (m.site?.name?.toLowerCase().includes(q))
          || (m.service_type?.toLowerCase().includes(q))
        if (!matches) return false
      }
      if (filterClient !== 'all' && m.client_id !== filterClient) return false
      if (filterUrgency !== 'all' && (m.urgency ?? m.priority) !== filterUrgency) return false
      return true
    })
  }, [missions, search, filterClient, filterUrgency])

  const byStatus = useMemo(() => {
    const map: Record<string, Mission[]> = {}
    for (const s of OPERATIONAL_MISSION_STATUS_ORDER) map[s] = []
    for (const m of filtered) {
      const s = getOperationalStatus(m)
      map[s]!.push(m)
    }
    return map
  }, [filtered])

  const totalAgentHours = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of missions) {
      if (m.status === 'terminee' || m.status === 'annulee') continue
      for (const a of m.agents ?? []) {
        map.set(a.id, (map.get(a.id) ?? 0) + m.planned_hours)
      }
    }
    return map
  }, [missions])

  const overloadedAgents = agents.filter(a => (totalAgentHours.get(a.id) ?? 0) > a.weekly_availability_hours)

  const selectedMission = selectedMissionId ? missions.find(m => m.id === selectedMissionId) : null

  const handleSimulateSignature = (opportunityId: string) => {
    const newMissionId = signOpportunityContract(opportunityId)
    if (newMissionId) {
      toast.success('Contrat signé — mission créée en "À organiser"')
      setSelectedMissionId(newMissionId)
    } else {
      toast.error('Échec de la création')
    }
  }

  const handleDragStart = (missionId: string) => (e: React.DragEvent) => {
    setDraggedMissionId(missionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnColumn = (status: OperationalMissionStatus) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!draggedMissionId) return
    const mission = missions.find(m => m.id === draggedMissionId)
    if (!mission) return
    const currentStatus = getOperationalStatus(mission)
    if (currentStatus === status) {
      setDraggedMissionId(null)
      return
    }
    updateMissionOperationalStatus(draggedMissionId, status)
    toast.success(`→ ${OPERATIONAL_MISSION_STATUS_LABELS[status]}`)
    setDraggedMissionId(null)
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
          <PageHeader
            title="Cockpit opérationnel"
            description="Centre de commandement — du contrat signé à la mission planifiée"
          />

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <KpiCard
              icon={ListChecks}
              label="À organiser"
              value={byStatus.a_organiser?.length ?? 0}
              tint="amber"
            />
            <KpiCard
              icon={Clock}
              label="En attente client"
              value={byStatus.en_attente_validation_client?.length ?? 0}
              tint="blue"
            />
            <KpiCard
              icon={TrendingUp}
              label="Planifiées"
              value={byStatus.planifie?.length ?? 0}
              tint="indigo"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Surcharge agents"
              value={overloadedAgents.length}
              tint={overloadedAgents.length > 0 ? 'rose' : 'emerald'}
            />
          </div>

          {/* Filtres + simulation signature */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Rechercher client, site, service…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterUrgency} onValueChange={setFilterUrgency}>
              <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Urgence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes urgences</SelectItem>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>

            {winnableOpportunities.length > 0 && (
              <div className="ml-auto">
                <SimulateSignatureMenu
                  opportunities={winnableOpportunities}
                  onSimulate={handleSimulateSignature}
                />
              </div>
            )}
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-3 h-full min-w-max">
            {OPERATIONAL_MISSION_STATUS_ORDER.map(status => {
              const colors = OPERATIONAL_MISSION_STATUS_COLORS[status]!
              const col = byStatus[status] ?? []
              const isDragOver = dragOverColumn === status
              return (
                <div
                  key={status}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColumn(status) }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={handleDropOnColumn(status)}
                  className={cn(
                    'w-72 flex-shrink-0 rounded-xl border-2 transition-all flex flex-col',
                    isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-white/60',
                  )}
                >
                  {/* Column header */}
                  <div className={cn('px-3 py-2 border-b border-slate-200 flex items-center justify-between', colors.bg)}>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                      <h3 className={cn('font-semibold text-xs uppercase tracking-wide', colors.text)}>
                        {OPERATIONAL_MISSION_STATUS_LABELS[status]}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{col.length}</Badge>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {col.map(m => (
                      <MissionCard
                        key={m.id}
                        mission={m}
                        isDragging={draggedMissionId === m.id}
                        onDragStart={handleDragStart(m.id)}
                        onClick={() => setSelectedMissionId(m.id)}
                      />
                    ))}
                    {col.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                        <p className="text-[11px] text-slate-400 italic">Vide</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <MissionDetailPanel
        mission={selectedMission ?? null}
        open={!!selectedMission}
        onClose={() => setSelectedMissionId(null)}
      />
    </AdminLayout>
  )
}

function KpiCard({
  icon: Icon, label, value, tint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tint: 'amber' | 'blue' | 'indigo' | 'rose' | 'emerald'
}) {
  const tints = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  }[tint]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tints.bg)}>
        <Icon className={cn('w-4 h-4', tints.text)} />
      </div>
      <div>
        <p className={cn('text-xl font-bold leading-tight', tints.text)}>{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function SimulateSignatureMenu({
  opportunities,
  onSimulate,
}: {
  opportunities: { id: string; prospect_name: string; converted_to_client: boolean }[]
  onSimulate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen(o => !o)} className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50">
        <Wand2 className="w-3.5 h-3.5" />
        Simuler signature contrat
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg z-30 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 px-2 py-1">Opportunités gagnées</p>
          <div className="max-h-72 overflow-y-auto">
            {opportunities.map(o => (
              <button
                key={o.id}
                onClick={() => { onSimulate(o.id); setOpen(false) }}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-violet-50 text-sm flex items-center gap-2"
              >
                <Sparkles className="w-3 h-3 text-violet-500" />
                <span className="truncate">{o.prospect_name}</span>
                {!o.converted_to_client && <Badge variant="secondary" className="ml-auto text-[10px]">Nouveau</Badge>}
              </button>
            ))}
            {opportunities.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-3 italic">Aucune opportunité gagnée</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
