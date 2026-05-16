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
import { Agent, Mission, OperationalItem, OperationalItemStatus, TimeEntry } from '@/types'
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
  const { operationalItems, missions, agents, sops, addMission, updateOperationalItem, deleteOperationalItem, addTimeEntry } = useAppStore()

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

  const handleCreateMission = () => {
    if (!assigningItem || !validate()) return

    const agent = agents.find(a => a.id === selectedAgentId)!
    const client = assigningItem.client
    const site = assigningItem.site
    const sop = sops.find(s => s.id === missionForm.sop_id)

    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      company_id: 'company-1',
      client_id: assigningItem.client_id,
      site_id: assigningItem.site_id,
      operational_item_id: assigningItem.id,
      service_type: site?.service_type ?? null,
      sop_id: missionForm.sop_id || null,
      status: 'prevue',
      scheduled_date: missionForm.scheduled_date,
      start_time: missionForm.start_time || null,
      planned_hours: parseFloat(missionForm.planned_hours) || 3,
      notes: missionForm.notes || null,
      priority: missionForm.priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client,
      site,
      agents: [agent],
      sop,
    }

    addMission(newMission)
    updateOperationalItem(assigningItem.id, {
      converted_to_mission: true,
      mission_id: newMission.id,
      status: 'planifie' as OperationalItemStatus,
    })

    // Create time entry
    const te: TimeEntry = {
      id: `te-${Date.now()}`,
      company_id: 'company-1',
      mission_id: newMission.id,
      agent_id: agent.id,
      client_id: assigningItem.client_id,
      site_id: assigningItem.site_id,
      date: missionForm.scheduled_date,
      planned_hours: parseFloat(missionForm.planned_hours) || 3,
      validated_hours: null,
      hourly_cost: agent.hourly_cost,
      total_cost: null,
      status: 'prevue',
      validated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agent,
      mission: newMission,
      client,
      site,
    }
    addTimeEntry(te)

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
          <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E2E8F0] bg-white">
            <button
              onClick={() => setAssigningItem(null)}
              className="flex items-center gap-2 text-[13px] text-[#475569] hover:text-[#0F172A] transition-colors font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Retour au cockpit
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-amber-50 rounded-[8px] flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] text-[13px]">{assigningItem.client?.name}</p>
                <p className="text-[11px] text-[#94A3B8]">{assigningItem.site?.name}</p>
              </div>
              {assigningItem.site?.address && (
                <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] ml-2">
                  <MapPin className="w-3 h-3" /> {assigningItem.site.address}
                </div>
              )}
            </div>
            <button
              onClick={handleCreateMission}
              disabled={hasConflict}
              className="flex items-center gap-2 h-9 px-4 bg-[#6366F1] text-white text-[13px] font-semibold rounded-[8px] hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirmer la mission
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* ── Left: Mission form ──────────────────────────────────────────── */}
            <div className="w-80 flex-shrink-0 border-r border-[#E2E8F0] bg-white overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-[13px] font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6366F1]" /> Détails de la mission
                </h2>

                {/* Date + heure (sélectionnables via calendrier) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Date *</Label>
                    <Input
                      type="date"
                      value={missionForm.scheduled_date}
                      onChange={e => setMissionForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className={cn(
                        'border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white focus:ring-2 focus:ring-[#6366F1]',
                        errors.scheduled_date && 'border-red-400'
                      )}
                    />
                    {errors.scheduled_date && <p className="text-[11px] text-red-500 mt-1">{errors.scheduled_date}</p>}
                  </div>
                  <div>
                    <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Heure *</Label>
                    <Input
                      type="time"
                      value={missionForm.start_time}
                      onChange={e => setMissionForm(f => ({ ...f, start_time: e.target.value }))}
                      className={cn(
                        'border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white focus:ring-2 focus:ring-[#6366F1]',
                        errors.start_time && 'border-red-400'
                      )}
                    />
                    {errors.start_time && <p className="text-[11px] text-red-500 mt-1">{errors.start_time}</p>}
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Durée (heures) *</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={missionForm.planned_hours}
                    onChange={e => setMissionForm(f => ({ ...f, planned_hours: e.target.value }))}
                    className={cn(
                      'border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white focus:ring-2 focus:ring-[#6366F1]',
                      errors.planned_hours && 'border-red-400'
                    )}
                  />
                  {errors.planned_hours && <p className="text-[11px] text-red-500 mt-1">{errors.planned_hours}</p>}
                </div>

                <div className="mb-4">
                  <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Priorité</Label>
                  <Select value={missionForm.priority} onValueChange={v => setMissionForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4">
                  <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Protocole SOP</Label>
                  <Select value={missionForm.sop_id} onValueChange={v => setMissionForm(f => ({ ...f, sop_id: v }))}>
                    <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] bg-white"><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      {sops.map(sop => (
                        <SelectItem key={sop.id} value={sop.id}>{sop.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Notes</Label>
                  <Textarea
                    rows={3}
                    value={missionForm.notes}
                    onChange={e => setMissionForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Instructions spécifiques..."
                    className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>
              </div>

              <div className="border-t border-[#F1F5F9]" />

              {/* Agent selector */}
              <div>
                <h2 className="text-[13px] font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6366F1]" /> Choisir un agent *
                </h2>
                {errors.agent && (
                  <p className="text-[11px] text-red-500 mb-2 flex items-center gap-1">
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
                          'w-full text-left rounded-[10px] border-2 p-3 transition-all',
                          isSelected && !conflict && 'border-[#6366F1] bg-[#EEF2FF]',
                          isSelected && conflict && 'border-red-400 bg-red-50',
                          !isSelected && !isUnavailable && 'border-[#E2E8F0] hover:border-[#6366F1] hover:bg-[#F8FAFC]',
                          isUnavailable && 'border-[#F1F5F9] bg-[#F8FAFC] opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                            isSelected ? 'bg-[#6366F1] text-white' : 'bg-[#EEF2FF] text-[#6366F1]',
                          )}>
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-[#0F172A] truncate">
                                {agent.first_name} {agent.last_name}
                              </p>
                              {isSelected && !conflict && (
                                <span className="text-[11px] bg-[#6366F1] text-white px-1.5 py-0.5 rounded-full">Sélectionné</span>
                              )}
                              {isSelected && conflict && (
                                <span className="text-[11px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">Conflit</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StatusBadge status={agent.status} />
                              <span className="text-[11px] text-[#94A3B8]">{weekHours}h/{agent.weekly_availability_hours}h cette semaine</span>
                            </div>
                          </div>
                        </div>
                        {/* Weekly load bar */}
                        <div className="mt-2 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              weekHours / agent.weekly_availability_hours > 0.8 ? 'bg-amber-400' : 'bg-[#6366F1]',
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
                <div className="rounded-[8px] bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-[12px] text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Cet agent a déjà une mission sur ce créneau. Choisissez une autre date/heure ou un autre agent.</p>
                </div>
              )}
            </div>

            {/* ── Right: Agent availability calendar ─────────────────────────── */}
            <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6366F1]" />
                  {selectedAgentId
                    ? `Disponibilités — ${agents.find(a => a.id === selectedAgentId)?.first_name} ${agents.find(a => a.id === selectedAgentId)?.last_name}`
                    : 'Sélectionnez un agent pour voir ses disponibilités'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarWeek(subWeeks(calendarWeek, 1))}
                    className="w-8 h-8 rounded-[8px] border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition-colors"
                    aria-label="Semaine précédente"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#475569]" />
                  </button>
                  <span className="text-[13px] font-medium text-[#0F172A] w-44 text-center">
                    {format(calendarWeek, 'dd MMM', { locale: fr })} – {format(addDays(calendarWeek, 6), 'dd MMM yyyy', { locale: fr })}
                  </span>
                  <button
                    onClick={() => setCalendarWeek(addWeeks(calendarWeek, 1))}
                    className="w-8 h-8 rounded-[8px] border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition-colors"
                    aria-label="Semaine suivante"
                  >
                    <ChevronRight className="w-4 h-4 text-[#475569]" />
                  </button>
                  <button
                    onClick={() => setCalendarWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="text-[12px] text-[#6366F1] hover:underline ml-2 font-medium"
                  >
                    Aujourd'hui
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
                {/* Header */}
                <div className="grid border-b border-[#E2E8F0]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                  <div className="border-r border-[#F1F5F9]" />
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date())
                    const isSelected = missionForm.scheduled_date === format(day, 'yyyy-MM-dd')
                    return (
                      <div key={day.toISOString()} className={cn(
                        'py-3 text-center border-r border-[#F1F5F9] last:border-0',
                        isSelected && 'bg-[#EEF2FF]',
                      )}>
                        <p className={cn('text-[11px] font-bold uppercase tracking-wide', isToday ? 'text-[#6366F1]' : 'text-[#94A3B8]')}>
                          {format(day, 'EEE', { locale: fr })}
                        </p>
                        <p className={cn(
                          'text-lg font-bold mt-0.5',
                          isToday ? 'text-[#6366F1]' : 'text-[#0F172A]',
                          isSelected && 'text-[#6366F1]',
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
                    <div key={hour} className="grid border-b border-[#F1F5F9] last:border-0" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minHeight: '40px' }}>
                      {/* Hour label */}
                      <div className="border-r border-[#F1F5F9] px-2 py-1 flex items-start">
                        <span className="text-[11px] text-[#94A3B8] font-mono">{String(hour).padStart(2, '0')}h</span>
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
                              'border-r border-[#F1F5F9] last:border-0 relative transition-colors',
                              !isPast && !isOccupied && selectedAgentId && 'cursor-pointer hover:bg-[#EEF2FF]',
                              isPast && 'bg-[#F8FAFC]',
                              isOccupied && 'bg-red-50',
                              isSelectedSlot && 'bg-[#EEF2FF]',
                            )}
                          >
                            {/* Occupied block */}
                            {isOccupied && !slotMission && (
                              <div className="absolute inset-0 bg-red-100 border-l-2 border-red-400" />
                            )}
                            {/* Mission start */}
                            {slotMission && (
                              <div className="absolute inset-x-0.5 top-0.5 rounded-[4px] bg-red-500 text-white text-[11px] px-1.5 py-0.5 z-10 truncate leading-tight">
                                {slotMission.client?.name}
                                <span className="opacity-75 ml-1">{slotMission.planned_hours}h</span>
                              </div>
                            )}
                            {/* Selected slot indicator */}
                            {isSelectedSlot && (
                              <div className="absolute inset-x-0.5 top-0.5 rounded-[4px] bg-[#6366F1] text-white text-[11px] px-1.5 py-0.5 z-10 leading-tight">
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
              <div className="flex items-center gap-6 mt-3 text-[12px] text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[3px] bg-red-400" />
                  <span>Déjà occupé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[3px] bg-[#6366F1]" />
                  <span>Créneau sélectionné</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[3px] bg-white border border-[#E2E8F0]" />
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
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Cockpit opérationnel</h1>
        </div>

        {/* Top stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <Calendar className="w-4 h-4 text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{missions.filter(m => m.scheduled_date === new Date().toISOString().split('T')[0]).length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Missions aujourd'hui</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <Users className="w-4 h-4 text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{agents.filter(a => a.status === 'disponible').length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Agents disponibles</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <AlertCircle className="w-4 h-4 text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{toOrganize.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">En attente</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <AlertCircle className="w-4 h-4 text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{missions.filter(m => m.status === 'probleme_signale').length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Problèmes</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* ── Left: Missions récentes ─────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Missions récentes</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {missions.slice(0, 10).map(mission => (
                <div key={mission.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{mission.client?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{mission.site?.name}</p>
                    </div>
                    <StatusBadge status={mission.status} />
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {format(parseISO(mission.scheduled_date), 'dd/MM/yyyy', { locale: fr })}
                      {mission.start_time && ` à ${mission.start_time}`}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" /> {mission.planned_hours}h
                      {mission.agents && mission.agents.length > 0 && (
                        <span className="ml-1 flex items-center gap-1">
                          · <Users className="w-3 h-3 text-gray-400" />
                          {mission.agents.map(a => `${a.first_name} ${a.last_name[0]}.`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {missions.length === 0 && (
                <div className="col-span-2 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucune mission planifiée</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Assignment panel ──────────────────────────────────────── */}
          <div>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-4">Opérations à organiser</h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                className="w-full border border-[#E2E8F0] rounded-[8px] h-9 pl-9 pr-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 mb-5">
              {toOrganize.map(item => (
                <div key={item.id} className="bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] p-3 mb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A] truncate">{item.client?.name}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{item.site?.name}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        item.priority === 'urgente' ? 'bg-red-50 text-red-700' :
                        item.priority === 'haute' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      )}>
                        {item.priority}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-[4px] hover:bg-[#E2E8F0] transition-colors" aria-label="Options">
                            <MoreVertical className="w-3 h-3 text-[#94A3B8]" />
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
                  <button
                    className="w-full mt-2 h-8 text-[12px] bg-[#6366F1] text-white rounded-[6px] font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                    onClick={() => handleOpenAssign(item)}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Assigner la mission
                  </button>
                </div>
              ))}

              {toOrganize.length === 0 && (
                <div className="border-2 border-dashed border-[#E2E8F0] rounded-[10px] p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-[12px] text-[#475569] font-medium">Tout est organisé</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Aucune opération en attente</p>
                </div>
              )}
            </div>

            {/* Agent availability section */}
            <div className="border-t border-[#F1F5F9] pt-4">
              <h3 className="text-[12px] font-semibold text-[#475569] mb-3">Disponibilité des agents</h3>
              <div className="flex flex-wrap gap-1.5">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] text-[12px] font-medium text-[#475569]">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      agent.status === 'disponible' ? 'bg-emerald-400' : 'bg-[#94A3B8]'
                    )} />
                    {agent.first_name} {agent.last_name[0]}.
                  </div>
                ))}
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
        onConfirm={() => { if (confirmDeleteItem) { deleteOperationalItem(confirmDeleteItem); toast.success('Opération supprimée'); setConfirmDeleteItem(null) } }}
        variant="destructive"
      />
    </AdminLayout>
  )
}
