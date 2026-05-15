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
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
      <div className="flex gap-4">
        {/* Left accent bar */}
        <div className={cn('w-1 rounded-full flex-shrink-0', getStatusAccentColor(mission.status))} />

        {/* Time column */}
        <div className="w-16 flex-shrink-0 text-center">
          <p className="text-[18px] font-bold text-[#0F172A] leading-none">
            {mission.start_time ? mission.start_time.slice(0, 5) : '—'}
          </p>
          <p className="text-[11px] text-[#94A3B8] mt-1">{mission.planned_hours}h</p>
        </div>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[#0F172A]">{mission.client?.name}</p>
          {mission.site?.name && (
            <p className="text-[12px] text-[#475569] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" /> {mission.site.name}
            </p>
          )}
          {mission.site?.address && (
            <p className="text-[11px] text-[#94A3B8] mt-0.5">{mission.site.address}
              {mission.site.access_code && <span className="ml-1">(Code: {mission.site.access_code})</span>}
            </p>
          )}

          {/* Agents row */}
          {mission.agents && mission.agents.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {mission.agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[10px] font-bold text-[#6366F1]">
                    {agent.first_name[0]}{agent.last_name[0]}
                  </div>
                  <span className="text-[11px] text-[#475569]">{agent.first_name}</span>
                </div>
              ))}
            </div>
          )}

          {mission.sop && (
            <div className="flex items-center gap-1 text-[11px] text-[#6366F1] mt-2">
              <BookOpen className="w-3 h-3" />
              Protocole: {mission.sop.title}
            </div>
          )}

          {mission.notes && (
            <div className="bg-amber-50 rounded-[6px] px-2.5 py-1.5 mt-2 text-[11px] text-amber-700">
              {mission.notes}
            </div>
          )}
        </div>

        {/* Right column: status + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={mission.status} />
          <div className="flex flex-col gap-1.5 mt-1">
            {mission.status === 'prevue' && (
              <button
                className="bg-[#6366F1] text-white rounded-[8px] h-8 px-3 text-[12px] font-semibold hover:bg-indigo-700 transition-colors"
                onClick={() => handleUpdateStatus(mission, 'en_cours')}
              >
                Démarrer
              </button>
            )}
            {mission.status === 'en_cours' && (
              <>
                <button
                  className="bg-emerald-500 text-white rounded-[8px] h-8 px-3 text-[12px] font-semibold hover:bg-emerald-600 transition-colors"
                  onClick={() => handleUpdateStatus(mission, 'a_valider')}
                >
                  Terminer
                </button>
                <button
                  className="bg-red-50 text-red-600 border border-red-200 rounded-[8px] h-8 px-3 text-[12px] font-medium hover:bg-red-100 transition-colors"
                  onClick={() => handleUpdateStatus(mission, 'probleme_signale')}
                >
                  Signaler problème
                </button>
              </>
            )}
            {mission.status === 'a_valider' && (
              <button
                className="bg-[#6366F1] text-white rounded-[8px] h-8 px-3 text-[12px] font-semibold hover:bg-indigo-700 transition-colors"
                onClick={() => handleUpdateStatus(mission, 'terminee')}
              >
                Valider
              </button>
            )}
            {mission.status === 'terminee' && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Validée
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        {/* Date header */}
        <div>
          <p className="text-[13px] font-semibold text-[#6366F1] uppercase tracking-wide">Aujourd'hui</p>
          <p className="text-[28px] font-bold text-[#0F172A]">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-5 gap-3">
          {(['prevue', 'en_cours', 'a_valider', 'terminee', 'probleme_signale'] as MissionStatus[]).map(status => (
            <div key={status} className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-3 text-center">
              <p className="text-[22px] font-bold text-[#0F172A] leading-none">
                {missions.filter(m => m.scheduled_date === today && m.status === status).length}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={status} />
              </div>
            </div>
          ))}
        </div>

        {/* Agent filter bar: horizontal scrollable pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterAgent('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer flex-shrink-0',
              filterAgent === 'all'
                ? 'bg-[#6366F1] text-white border-[#6366F1]'
                : 'border-[#E2E8F0] text-[#475569] bg-white hover:border-[#6366F1]'
            )}
          >
            Tous les agents
          </button>
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => setFilterAgent(a.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer flex-shrink-0',
                filterAgent === a.id
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'border-[#E2E8F0] text-[#475569] bg-white hover:border-[#6366F1]'
              )}
            >
              {a.first_name} {a.last_name}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'prevue', 'en_cours', 'a_valider', 'terminee', 'probleme_signale'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer',
                filterStatus === s
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'border-[#E2E8F0] text-[#475569] bg-white hover:border-[#6366F1]'
              )}
            >
              {s === 'all' ? 'Tous' : MISSION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <Tabs defaultValue="today">
          <TabsList className="mb-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] p-1">
            <TabsTrigger value="today" className="text-[13px] rounded-[6px]">
              Aujourd'hui ({todayMissions.length})
            </TabsTrigger>
            <TabsTrigger value="week" className="text-[13px] rounded-[6px]">
              Cette semaine ({weekMissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {todayMissions.length === 0 ? (
              <div className="text-center py-16 text-[#94A3B8]">
                <CheckCircle2 className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" />
                <p className="text-[15px] font-medium text-[#475569]">Aucune mission aujourd'hui</p>
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
                    <h3 className="text-[13px] font-semibold text-[#475569] mb-3 flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', date === today ? 'bg-[#6366F1]' : 'bg-[#94A3B8]')} />
                      {format(new Date(date + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}
                      {date === today && (
                        <span className="text-[11px] bg-[#EEF2FF] text-[#6366F1] font-semibold px-2 py-0.5 rounded-full ml-1">
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
              <div className="bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] p-3 text-[13px]">
                <p className="font-semibold text-[#0F172A]">{selectedMission.client?.name}</p>
                <p className="text-[#475569]">{selectedMission.site?.name}</p>
                <p className="text-[#94A3B8] mt-0.5">Prévu: {selectedMission.planned_hours}h</p>
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Heures réalisées</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={validationHours}
                  onChange={e => setValidationHours(e.target.value)}
                  className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setSelectedMission(null)}
              className="h-9 px-4 text-[13px] font-medium text-[#475569] border border-[#E2E8F0] rounded-[8px] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              className="h-9 px-4 text-[13px] font-semibold text-white bg-[#6366F1] rounded-[8px] hover:bg-indigo-700 transition-colors"
            >
              Valider
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
