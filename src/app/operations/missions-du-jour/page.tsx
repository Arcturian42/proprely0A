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

export default function MissionsDuJourPage() {
  useEffect(() => { document.title = 'Missions du Jour — Proprely' }, [])
  const { missions, updateMissionStatus, agents } = useAppStore()
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [validationHours, setValidationHours] = useState('')
  const [filterAgent, setFilterAgent] = useState('all')

  const today = new Date().toISOString().split('T')[0]
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    return format(addDays(start, i), 'yyyy-MM-dd')
  })

  const filterByAgent = (ms: Mission[]) =>
    filterAgent === 'all' ? ms : ms.filter(m => m.agents?.some(a => a.id === filterAgent))

  const todayMissions = filterByAgent(missions.filter(m => m.scheduled_date === today))
  const weekMissions = filterByAgent(missions.filter(m => weekDates.includes(m.scheduled_date)))

  const handleUpdateStatus = async (mission: Mission, status: MissionStatus) => {
    if (status === 'terminee') {
      // "Valider" button: open dialog to confirm hours
      setSelectedMission(mission)
      setValidationHours(mission.planned_hours.toString())
    } else {
      await updateMissionStatus(mission.id, status)
      toast.success(`Mission : ${MISSION_STATUS_LABELS[status]}`)
    }
  }

  const handleValidate = async () => {
    if (!selectedMission) return
    const hours = parseFloat(validationHours)
    if (isNaN(hours) || hours <= 0) {
      toast.error('Heures invalides')
      return
    }
    await updateMissionStatus(selectedMission.id, 'terminee', hours)
    toast.success(`Mission validée — ${hours}h enregistrées`)
    setSelectedMission(null)
  }

  const MissionCard = ({ mission }: { mission: Mission }) => (
    <Card className={`${mission.status === 'probleme_signale' ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">{mission.client?.name}</p>
            <p className="text-sm text-slate-500">{mission.site?.name}</p>
          </div>
          <StatusBadge status={mission.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {mission.start_time || 'Non défini'} · {mission.planned_hours}h
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            {mission.agents?.map(a => `${a.first_name}`).join(', ') || 'Non assigné'}
          </div>
          {mission.site?.address && (
            <div className="flex items-center gap-1 col-span-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              {mission.site.address}
              {mission.site.access_code && <span className="text-slate-400 ml-1">(Code: {mission.site.access_code})</span>}
            </div>
          )}
        </div>

        {mission.sop && (
          <div className="flex items-center gap-1 text-xs text-indigo-600 mb-3">
            <BookOpen className="w-3 h-3" />
            Protocole: {mission.sop.title}
          </div>
        )}

        {mission.notes && (
          <div className="bg-amber-50 rounded-lg p-2 mb-3 text-xs text-amber-700">
            {mission.notes}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {mission.status === 'prevue' && (
            <Button size="sm" className="gap-1" onClick={() => handleUpdateStatus(mission, 'en_cours')}>
              Démarrer
            </Button>
          )}
          {mission.status === 'en_cours' && (
            <>
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(mission, 'a_valider')}>
                <CheckCircle2 className="w-3 h-3" /> Terminer
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleUpdateStatus(mission, 'probleme_signale')}>
                <AlertTriangle className="w-3 h-3" /> Signaler problème
              </Button>
            </>
          )}
          {mission.status === 'a_valider' && (
            <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateStatus(mission, 'terminee')}>
              <CheckCircle2 className="w-3 h-3" /> Valider
            </Button>
          )}
          {mission.status === 'terminee' && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" /> Mission validée
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Missions du jour"
          description={`Interventions du ${formatDate(new Date())}`}
        />

        {/* Today stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {(['prevue', 'en_cours', 'a_valider', 'terminee', 'probleme_signale'] as MissionStatus[]).map(status => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {todayMissions.filter(m => m.status === status).length}
                </p>
                <StatusBadge status={status} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent filter */}
        <div className="mb-4">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrer par agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="mb-6">
            <TabsTrigger value="today">Aujourd'hui ({todayMissions.length})</TabsTrigger>
            <TabsTrigger value="week">Cette semaine ({weekMissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {todayMissions.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle2 className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-lg font-medium">Aucune mission aujourd'hui</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayMissions.map(mission => (
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
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${date === today ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      {format(new Date(date + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}
                      {date === today && <Badge variant="default" className="ml-1 text-xs">Aujourd'hui</Badge>}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dayMissions.map(mission => (
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
            <DialogTitle>Valider les heures</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedMission.client?.name}</p>
                <p className="text-slate-500">{selectedMission.site?.name}</p>
                <p className="text-slate-500">Prévu: {selectedMission.planned_hours}h</p>
              </div>
              <div>
                <Label>Heures réalisées</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={validationHours}
                  onChange={e => setValidationHours(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMission(null)}>Annuler</Button>
            <Button onClick={handleValidate}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
