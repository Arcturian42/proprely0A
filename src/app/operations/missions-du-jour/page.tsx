'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { Mission, MissionStatus } from '@/types'
import { MISSION_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, Clock, Users, MapPin, AlertTriangle, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

function getStatusAccentColor(status: string) {
  switch (status) {
    case 'terminee': return 'bg-emerald-500'
    case 'en_cours': return 'bg-blue-500'
    case 'probleme_signale': return 'bg-red-500'
    case 'a_valider': return 'bg-amber-500'
    default: return 'bg-[#94A3B8]'
  }
}

export default function MissionsDuJourPage() {
  useEffect(() => { document.title = 'Missions du Jour — Proprely' }, [])
  const { missions, updateMissionStatus, agents } = useAppStore()
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [validationHours, setValidationHours] = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const today = new Date().toISOString().split('T')[0]
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    return format(addDays(start, i), 'yyyy-MM-dd')
  })

  const filterByAgent = (ms: Mission[]) =>
    filterAgent === 'all' ? ms : ms.filter(m => m.agents?.some(a => a.id === filterAgent))

  const filterByStatus = (ms: Mission[]) =>
    filterStatus === 'all' ? ms : ms.filter(m => m.status === filterStatus)

  const todayMissions = filterByStatus(filterByAgent(missions.filter(m => m.scheduled_date === today)))
  const weekMissions = filterByStatus(filterByAgent(missions.filter(m => weekDates.includes(m.scheduled_date))))

  const handleUpdateStatus = (mission: Mission, status: MissionStatus) => {
    if (status === 'terminee') {
      // "Valider" button: open dialog to confirm hours
      setSelectedMission(mission)
      setValidationHours(mission.planned_hours.toString())
    } else {
      updateMissionStatus(mission.id, status)
      toast.success(`Mission : ${MISSION_STATUS_LABELS[status]}`)
    }
  }

  const handleValidate = () => {
    if (!selectedMission) return
    const hours = parseFloat(validationHours)
    if (isNaN(hours) || hours <= 0) {
      toast.error('Heures invalides')
      return
    }
    updateMissionStatus(selectedMission.id, 'terminee', hours)
    toast.success(`Mission validée — ${hours}h enregistrées`)
    setSelectedMission(null)
  }

  const MissionCard = ({ mission }: { mission: Mission }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex">
      {/* Status bar */}
      <div className={cn('w-1 flex-shrink-0', getStatusAccentColor(mission.status))} />
      {/* Content */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900">{mission.client?.name}</p>
            {mission.site?.name && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" /> {mission.site.name}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge status={mission.status} />
            <div className="flex flex-col gap-1.5">
              {mission.status === 'prevue' && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleUpdateStatus(mission, 'en_cours')}>
                  Démarrer
                </Button>
              )}
              {mission.status === 'en_cours' && (
                <>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleUpdateStatus(mission, 'a_valider')}>
                    Terminer
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleUpdateStatus(mission, 'probleme_signale')}>
                    Signaler problème
                  </Button>
                </>
              )}
              {mission.status === 'a_valider' && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleUpdateStatus(mission, 'terminee')}>
                  Valider
                </Button>
              )}
              {mission.status === 'terminee' && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Validée
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent row */}
        {mission.agents && mission.agents.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {mission.agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                  {agent.first_name[0]}{agent.last_name[0]}
                </div>
                <span className="text-xs text-gray-600">{agent.first_name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-mono text-gray-400 flex-1">
            {mission.start_time ? mission.start_time.slice(0, 5) : '—'} · {mission.planned_hours}h
          </span>
          {mission.sop && (
            <div className="flex items-center gap-1 text-xs text-indigo-600">
              <BookOpen className="w-3 h-3" /> {mission.sop.title}
            </div>
          )}
        </div>

        {mission.notes && (
          <div className="bg-amber-50 rounded-md px-2.5 py-1.5 mt-2 text-xs text-amber-700">
            {mission.notes}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Date header */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">AUJOURD'HUI</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {(['prevue', 'en_cours', 'a_valider', 'terminee', 'probleme_signale'] as MissionStatus[]).map(status => (
            <div key={status} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {missions.filter(m => m.scheduled_date === today && m.status === status).length}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={status} />
              </div>
            </div>
          ))}
        </div>

        {/* Agent filter bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap">
          <button
            onClick={() => setFilterAgent('all')}
            className={cn(
              'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap',
              filterAgent === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            Tous les agents
          </button>
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => setFilterAgent(a.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap',
                filterAgent === a.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {a.first_name} {a.last_name}
            </button>
          ))}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'prevue', 'en_cours', 'a_valider', 'terminee', 'probleme_signale'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                filterStatus === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {s === 'all' ? 'Tous' : MISSION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <Tabs defaultValue="today">
          <TabsList className="mb-4">
            <TabsTrigger value="today">Aujourd'hui ({todayMissions.length})</TabsTrigger>
            <TabsTrigger value="week">Cette semaine ({weekMissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {todayMissions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle2 className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <p className="text-sm font-medium text-gray-500">Aucune mission aujourd'hui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayMissions
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                  .map(mission => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="week">
            <div className="space-y-6">
              {weekDates.map(date => {
                const dayMissions = weekMissions.filter(m => m.scheduled_date === date)
                if (dayMissions.length === 0) return null
                return (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', date === today ? 'bg-indigo-500' : 'bg-gray-300')} />
                      {format(new Date(date + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}
                      {date === today && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full ml-1">
                          Aujourd'hui
                        </span>
                      )}
                    </h3>
                    <div className="space-y-3">
                      {dayMissions
                        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                        .map(mission => (
                          <MissionCard key={mission.id} mission={mission} />
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Validation dialog */}
      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-bold text-[#0F172A]">Valider les heures</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-semibold text-gray-900">{selectedMission.client?.name}</p>
                <p className="text-gray-500">{selectedMission.site?.name}</p>
                <p className="text-gray-400 mt-0.5">Prévu: {selectedMission.planned_hours}h</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Heures réalisées</Label>
                <Input type="number" min="0.5" step="0.5" value={validationHours} onChange={e => setValidationHours(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMission(null)}>Annuler</Button>
            <Button onClick={handleValidate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
