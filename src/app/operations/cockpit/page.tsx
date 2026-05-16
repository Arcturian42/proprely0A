'use client'

import { useState, useMemo, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { Agent, Mission, OperationalItem, OperationalItemStatus } from '@/types'
import { cn } from '@/lib/utils'
import {
  Calendar, Clock, Users, MapPin, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Search, Building2, UserCheck,
  ArrowRight, Trash2, MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { addDays, format, startOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 6h → 19h

function getAgentMissionsForWeek(
  agentId: string,
  missions: Mission[],
  weekStart: Date,
): Mission[] {
  return missions.filter(m => {
    if (!m.agents?.some(a => a.id === agentId)) return false
    const d = new Date(m.scheduled_date + 'T12:00:00')
    const weekEnd = addDays(weekStart, 7)
    return d >= weekStart && d < weekEnd
  })
}

function missionToSlot(mission: Mission): { start: number; end: number } {
  const startH = mission.start_time
    ? parseInt(mission.start_time.split(':')[0]) + parseInt(mission.start_time.split(':')[1]) / 60
    : 8
  return { start: startH, end: startH + mission.planned_hours }
}

function isSlotConflict(
  agentId: string,
  date: string,
  startH: number,
  durationH: number,
  missions: Mission[],
): boolean {
  const endH = startH + durationH
  return missions
    .filter(m => m.scheduled_date === date && m.agents?.some(a => a.id === agentId))
    .some(m => {
      const slot = missionToSlot(m)
      return startH < slot.end && endH > slot.start
    })
}

export default function CockpitPage() {
  useEffect(() => { document.title = 'Cockpit — Proprely' }, [])
  const { operationalItems, missions, agents, sops, addMission, updateOperationalItem, deleteOperationalItem, addTimeEntry, companyId } = useAppStore()

  // Left panel state
  const [search, setSearch] = useState('')
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null)

  // Assignment panel state
  const [assigningItem, setAssigningItem] = useState<OperationalItem | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [missionForm, setMissionForm] = useState({
    scheduled_date: '',
    start_time: '',
    planned_hours: '3',
    sop_id: '',
    priority: 'normale',
    notes: '',
  })
  const [calendarWeek, setCalendarWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toOrganize = operationalItems.filter(i =>
    i.status === 'a_organiser' && !i.converted_to_mission
  ).filter(i =>
    !search ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.site?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const planned = operationalItems.filter(i => i.status === 'planifie' || i.converted_to_mission)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(calendarWeek, i))

  // For selected agent: compute their occupied slots this week
  const agentWeekMissions = useMemo(() => {
    if (!selectedAgentId) return []
    return getAgentMissionsForWeek(selectedAgentId, missions, calendarWeek)
  }, [selectedAgentId, missions, calendarWeek])

  // Weekly hours per agent
  const agentWeeklyHours = useMemo(() => {
    const weekEnd = addDays(calendarWeek, 7)
    return agents.map(a => {
      const hours = missions
        .filter(m => m.agents?.some(ag => ag.id === a.id))
        .filter(m => {
          const d = new Date(m.scheduled_date + 'T12:00:00')
          return d >= calendarWeek && d < weekEnd
        })
        .reduce((sum, m) => sum + m.planned_hours, 0)
      return { agentId: a.id, hours }
    })
  }, [agents, missions, calendarWeek])

  const getAgentHours = (agentId: string) =>
    agentWeeklyHours.find(a => a.agentId === agentId)?.hours ?? 0

  const hasConflict = useMemo(() => {
    if (!selectedAgentId || !missionForm.scheduled_date || !missionForm.start_time) return false
    const startH = parseInt(missionForm.start_time.split(':')[0]) + parseInt(missionForm.start_time.split(':')[1]) / 60
    return isSlotConflict(selectedAgentId, missionForm.scheduled_date, startH, parseFloat(missionForm.planned_hours) || 2, missions)
  }, [selectedAgentId, missionForm.scheduled_date, missionForm.start_time, missionForm.planned_hours, missions])

  const handleOpenAssign = (item: OperationalItem) => {
    setAssigningItem(item)
    setSelectedAgentId(null)
    setMissionForm({
      scheduled_date: '',
      start_time: '',
      planned_hours: '3',
      sop_id: '',
      priority: 'normale',
      notes: '',
    })
    setErrors({})
    setCalendarWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleCalendarSlotClick = (day: Date, hour: number) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const timeStr = `${String(hour).padStart(2, '0')}:00`
    setMissionForm(f => ({ ...f, scheduled_date: dateStr, start_time: timeStr }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!missionForm.scheduled_date) e.scheduled_date = 'Date requise'
    if (!missionForm.start_time) e.start_time = 'Heure requise'
    if (!selectedAgentId) e.agent = 'Sélectionnez un agent'
    const h = parseFloat(missionForm.planned_hours)
    if (isNaN(h) || h < 0.5 || h > 12) e.planned_hours = 'Durée entre 0.5h et 12h'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreateMission = async () => {
    if (!assigningItem || !validate()) return
    if (!companyId) { toast.error('Données non chargées'); return }

    const agent = agents.find(a => a.id === selectedAgentId)!
    const site = assigningItem.site
    const plannedHours = parseFloat(missionForm.planned_hours) || 3

    await addMission({
      company_id: companyId,
      client_id: assigningItem.client_id,
      site_id: assigningItem.site_id,
      operational_item_id: assigningItem.id,
      service_type: site?.service_type ?? null,
      sop_id: missionForm.sop_id || null,
      status: 'prevue',
      scheduled_date: missionForm.scheduled_date,
      start_time: missionForm.start_time || null,
      planned_hours: plannedHours,
      notes: missionForm.notes || null,
      priority: missionForm.priority,
    }, selectedAgentId ? [selectedAgentId] : [])

    // Find the newly created mission to get its ID (last added mission)
    const newMissions = useAppStore.getState().missions
    const newMission = newMissions.find(m =>
      m.client_id === assigningItem.client_id &&
      m.scheduled_date === missionForm.scheduled_date &&
      m.operational_item_id === assigningItem.id
    )

    if (newMission) {
      await updateOperationalItem(assigningItem.id, {
        converted_to_mission: true,
        mission_id: newMission.id,
        status: 'planifie' as OperationalItemStatus,
      })

      await addTimeEntry({
        company_id: companyId,
        mission_id: newMission.id,
        agent_id: agent.id,
        client_id: assigningItem.client_id,
        site_id: assigningItem.site_id,
        date: missionForm.scheduled_date,
        planned_hours: plannedHours,
        validated_hours: null,
        hourly_cost: agent.hourly_cost,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
      })
    }

    toast.success(`Mission planifiée — ${agent.first_name} ${agent.last_name} le ${format(parseISO(missionForm.scheduled_date), 'dd/MM à HH:mm', { locale: fr })}`)
    setAssigningItem(null)
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  // Full-screen assignment view when an item is selected
  if (assigningItem) {
    return (
      <AdminLayout>
        <div className="flex flex-col h-full">
          {/* Top bar */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 bg-white">
            <button
              onClick={() => setAssigningItem(null)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Retour au cockpit
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{assigningItem.client?.name}</p>
                <p className="text-xs text-slate-500">{assigningItem.site?.name}</p>
              </div>
              {assigningItem.site?.address && (
                <div className="flex items-center gap-1 text-xs text-slate-400 ml-2">
                  <MapPin className="w-3 h-3" /> {assigningItem.site.address}
                </div>
              )}
            </div>
            <Button onClick={handleCreateMission} className="gap-2" disabled={hasConflict}>
              <CheckCircle2 className="w-4 h-4" /> Confirmer la mission
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* ── Left: Mission form ──────────────────────────────────────────── */}
            <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Détails de la mission
                </h2>

                {/* Date + heure (sélectionnables via calendrier) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label className="text-xs">Date *</Label>
                    <Input
                      type="date"
                      value={missionForm.scheduled_date}
                      onChange={e => setMissionForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className={errors.scheduled_date ? 'border-red-400' : ''}
                    />
                    {errors.scheduled_date && <p className="text-xs text-red-500 mt-1">{errors.scheduled_date}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Heure *</Label>
                    <Input
                      type="time"
                      value={missionForm.start_time}
                      onChange={e => setMissionForm(f => ({ ...f, start_time: e.target.value }))}
                      className={errors.start_time ? 'border-red-400' : ''}
                    />
                    {errors.start_time && <p className="text-xs text-red-500 mt-1">{errors.start_time}</p>}
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-xs">Durée (heures) *</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={missionForm.planned_hours}
                    onChange={e => setMissionForm(f => ({ ...f, planned_hours: e.target.value }))}
                    className={errors.planned_hours ? 'border-red-400' : ''}
                  />
                  {errors.planned_hours && <p className="text-xs text-red-500 mt-1">{errors.planned_hours}</p>}
                </div>

                <div className="mb-4">
                  <Label className="text-xs">Priorité</Label>
                  <Select value={missionForm.priority} onValueChange={v => setMissionForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4">
                  <Label className="text-xs">Protocole SOP</Label>
                  <Select value={missionForm.sop_id} onValueChange={v => setMissionForm(f => ({ ...f, sop_id: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      {sops.map(sop => (
                        <SelectItem key={sop.id} value={sop.id}>{sop.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={3}
                    value={missionForm.notes}
                    onChange={e => setMissionForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Instructions spécifiques..."
                  />
                </div>
              </div>

              <Separator />

              {/* Agent selector */}
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> Choisir un agent *
                </h2>
                {errors.agent && (
                  <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.agent}
                  </p>
                )}
                <div className="space-y-2">
                  {agents.map(agent => {
                    const weekHours = getAgentHours(agent.id)
                    const isSelected = selectedAgentId === agent.id
                    const isUnavailable = agent.status === 'absent' || agent.status === 'inactif'
                    const conflict = isSelected && hasConflict

                    return (
                      <button
                        key={agent.id}
                        onClick={() => !isUnavailable && setSelectedAgentId(isSelected ? null : agent.id)}
                        disabled={isUnavailable}
                        className={cn(
                          'w-full text-left rounded-xl border-2 p-3 transition-all',
                          isSelected && !conflict && 'border-indigo-500 bg-indigo-50',
                          isSelected && conflict && 'border-red-400 bg-red-50',
                          !isSelected && !isUnavailable && 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                          isUnavailable && 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600',
                          )}>
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {agent.first_name} {agent.last_name}
                              </p>
                              {isSelected && !conflict && (
                                <Badge className="text-xs bg-indigo-600 text-white py-0">Sélectionné</Badge>
                              )}
                              {isSelected && conflict && (
                                <Badge variant="destructive" className="text-xs py-0">Conflit</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StatusBadge status={agent.status} />
                              <span className="text-xs text-slate-400">{weekHours}h/{agent.weekly_availability_hours}h cette semaine</span>
                            </div>
                          </div>
                        </div>
                        {/* Weekly load bar */}
                        <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              weekHours / agent.weekly_availability_hours > 0.8 ? 'bg-amber-400' : 'bg-indigo-400',
                            )}
                            style={{ width: `${Math.min(100, (weekHours / agent.weekly_availability_hours) * 100)}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Conflict warning */}
              {hasConflict && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Cet agent a déjà une mission sur ce créneau. Choisissez une autre date/heure ou un autre agent.</p>
                </div>
              )}
            </div>

            {/* ── Right: Agent availability calendar ─────────────────────────── */}
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {selectedAgentId
                    ? `Disponibilités — ${agents.find(a => a.id === selectedAgentId)?.first_name} ${agents.find(a => a.id === selectedAgentId)?.last_name}`
                    : 'Sélectionnez un agent pour voir ses disponibilités'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarWeek(subWeeks(calendarWeek, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    aria-label="Semaine précédente"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 w-40 text-center">
                    {format(calendarWeek, 'dd MMM', { locale: fr })} – {format(addDays(calendarWeek, 6), 'dd MMM yyyy', { locale: fr })}
                  </span>
                  <button
                    onClick={() => setCalendarWeek(addWeeks(calendarWeek, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    aria-label="Semaine suivante"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setCalendarWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="text-xs text-indigo-600 hover:underline ml-2"
                  >
                    Aujourd'hui
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                  <div className="border-r border-slate-100" />
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date())
                    const isSelected = missionForm.scheduled_date === format(day, 'yyyy-MM-dd')
                    return (
                      <div key={day.toISOString()} className={cn(
                        'py-3 text-center border-r border-slate-100 last:border-0',
                        isSelected && 'bg-indigo-50',
                      )}>
                        <p className={cn('text-xs font-medium uppercase tracking-wide', isToday ? 'text-indigo-600' : 'text-slate-500')}>
                          {format(day, 'EEE', { locale: fr })}
                        </p>
                        <p className={cn(
                          'text-lg font-bold mt-0.5',
                          isToday ? 'text-indigo-600' : 'text-slate-800',
                          isSelected && 'text-indigo-700',
                        )}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Time grid */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {HOURS.map(hour => (
                    <div key={hour} className="grid border-b border-slate-100 last:border-0" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minHeight: '40px' }}>
                      {/* Hour label */}
                      <div className="border-r border-slate-100 px-2 py-1 flex items-start">
                        <span className="text-xs text-slate-400 font-mono">{String(hour).padStart(2, '0')}h</span>
                      </div>
                      {/* Day cells */}
                      {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
                        const isSelectedSlot = missionForm.scheduled_date === dateStr &&
                          missionForm.start_time?.startsWith(String(hour).padStart(2, '0'))

                        // Find missions that start at this hour for selected agent
                        const slotMission = selectedAgentId
                          ? agentWeekMissions.find(m => {
                              if (m.scheduled_date !== dateStr) return false
                              const startH = m.start_time ? parseInt(m.start_time.split(':')[0]) : 8
                              return startH === hour
                            })
                          : null

                        // Is this hour within a mission block?
                        const isOccupied = selectedAgentId
                          ? agentWeekMissions.some(m => {
                              if (m.scheduled_date !== dateStr) return false
                              const slot = missionToSlot(m)
                              return hour >= slot.start && hour < slot.end
                            })
                          : false

                        return (
                          <div
                            key={day.toISOString()}
                            onClick={() => !isPast && !isOccupied && selectedAgentId && handleCalendarSlotClick(day, hour)}
                            className={cn(
                              'border-r border-slate-100 last:border-0 relative transition-colors',
                              !isPast && !isOccupied && selectedAgentId && 'cursor-pointer hover:bg-indigo-50',
                              isPast && 'bg-slate-50',
                              isOccupied && 'bg-rose-50',
                              isSelectedSlot && 'bg-indigo-100',
                            )}
                          >
                            {/* Occupied block */}
                            {isOccupied && !slotMission && (
                              <div className="absolute inset-0 bg-rose-100 border-l-2 border-rose-400" />
                            )}
                            {/* Mission start */}
                            {slotMission && (
                              <div className="absolute inset-x-0.5 top-0.5 rounded bg-rose-500 text-white text-xs px-1.5 py-0.5 z-10 truncate leading-tight">
                                {slotMission.client?.name}
                                <span className="opacity-75 ml-1">{slotMission.planned_hours}h</span>
                              </div>
                            )}
                            {/* Selected slot indicator */}
                            {isSelectedSlot && (
                              <div className="absolute inset-x-0.5 top-0.5 rounded bg-indigo-500 text-white text-xs px-1.5 py-0.5 z-10 leading-tight">
                                ← Sélectionné
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-rose-400" />
                  <span>Déjà occupé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-indigo-400" />
                  <span>Créneau sélectionné</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-white border border-slate-300" />
                  <span>Disponible (cliquer pour sélectionner)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ── MAIN COCKPIT VIEW ──────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        <div className="p-8 flex-1 overflow-auto">
          <PageHeader
            title="Cockpit opérationnel"
            description="Organisez et assignez les missions aux agents"
          />

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{toOrganize.length}</p>
                  <p className="text-xs text-slate-500">À organiser</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{planned.length}</p>
                  <p className="text-xs text-slate-500">Planifiées</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-6">
            {/* ── Left: À organiser ─────────────────────────────────────────── */}
            <div className="w-96 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  À organiser
                  <Badge variant="secondary">{toOrganize.length}</Badge>
                </h2>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {toOrganize.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">{item.client?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{item.site?.name}</p>
                          {item.site?.address && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {item.site.address}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge
                            variant={item.priority === 'haute' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-slate-100" aria-label="Options">
                                <MoreVertical className="w-3 h-3 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDeleteItem(item.id)}>
                                <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {item.site?.service_type && (
                        <Badge variant="outline" className="text-xs mb-3">{item.site.service_type}</Badge>
                      )}

                      {item.source === 'pipeline' && (
                        <p className="text-xs text-indigo-600 mb-2 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Issu du pipeline commercial
                        </p>
                      )}

                      <Button
                        size="sm"
                        className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 mt-1"
                        onClick={() => handleOpenAssign(item)}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Assigner la mission
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {toOrganize.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Tout est organisé</p>
                    <p className="text-xs text-slate-400 mt-1">Aucune opération en attente</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Missions planifiées ────────────────────────────────── */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Missions récentes
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {missions.slice(0, 10).map(mission => (
                  <Card key={mission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{mission.client?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{mission.site?.name}</p>
                        </div>
                        <StatusBadge status={mission.status} />
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(mission.scheduled_date), 'dd/MM/yyyy', { locale: fr })}
                          {mission.start_time && ` à ${mission.start_time}`}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {mission.planned_hours}h
                          {mission.agents && mission.agents.length > 0 && (
                            <span className="ml-1 flex items-center gap-1">
                              · <Users className="w-3 h-3" />
                              {mission.agents.map(a => `${a.first_name} ${a.last_name[0]}.`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {missions.length === 0 && (
                  <div className="col-span-2 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Aucune mission planifiée</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteItem}
        onOpenChange={open => { if (!open) setConfirmDeleteItem(null) }}
        title="Supprimer l'opération"
        description="Cette action est irréversible."
        onConfirm={async () => { if (confirmDeleteItem) { await deleteOperationalItem(confirmDeleteItem); toast.success('Opération supprimée'); setConfirmDeleteItem(null) } }}
        variant="destructive"
      />
    </AdminLayout>
  )
}
