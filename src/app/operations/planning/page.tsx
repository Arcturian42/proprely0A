'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/lib/store'
import { Mission, MissionStatus } from '@/types'
import { MISSION_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { addDays, startOfWeek, format, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function PlanningPage() {
  useEffect(() => { document.title = 'Planning — Proprely' }, [])
  const { missions, agents, clients, sites, sops, addMission, addTimeEntry } = useAppStore()
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [form, setForm] = useState({
    client_id: '', site_id: '', scheduled_date: '', start_time: '',
    planned_hours: '2', sop_id: '', notes: '', priority: 'normale', service_type: '',
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const getMissionsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return missions.filter(m => {
      const match = m.scheduled_date === dateStr
      const statusMatch = filterStatus === 'all' || m.status === filterStatus
      return match && statusMatch
    })
  }

  const handleSave = () => {
    if (!form.client_id || !form.site_id || !form.scheduled_date) {
      toast.error('Client, site et date requis')
      return
    }
    const missionAgents = agents.filter(a => selectedAgents.includes(a.id))
    const client = clients.find(c => c.id === form.client_id)
    const site = sites.find(s => s.id === form.site_id)
    const sop = sops.find(s => s.id === form.sop_id)
    const missionId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newMission: Mission = {
      id: missionId, company_id: 'company-1',
      client_id: form.client_id, site_id: form.site_id, operational_item_id: null,
      service_type: form.service_type || null, sop_id: form.sop_id || null,
      status: 'prevue', scheduled_date: form.scheduled_date,
      start_time: form.start_time || null, planned_hours: parseFloat(form.planned_hours) || 2,
      notes: form.notes || null, priority: form.priority,
      created_at: now, updated_at: now,
      client, site, agents: missionAgents, sop,
    }
    addMission(newMission)

    for (const agent of missionAgents) {
      addTimeEntry({
        id: crypto.randomUUID(),
        company_id: 'company-1',
        mission_id: missionId,
        agent_id: agent.id,
        client_id: form.client_id,
        site_id: form.site_id,
        date: form.scheduled_date,
        planned_hours: parseFloat(form.planned_hours) || 2,
        validated_hours: null,
        hourly_cost: agent.hourly_cost ?? null,
        total_cost: null,
        status: 'prevue',
        validated_at: null,
        created_at: now,
        updated_at: now,
      })
    }

    toast.success('Mission planifiée')
    setShowForm(false)
  }

  const clientSites = sites.filter(s => s.client_id === form.client_id)

  return (
    <AdminLayout>
      <div className="p-6">
        <PageHeader
          title="Planning des missions"
          description="Vue calendrier de vos interventions"
          action={
            <button
              onClick={() => {
                setForm({ client_id: '', site_id: '', scheduled_date: '', start_time: '', planned_hours: '2', sop_id: '', notes: '', priority: 'normale', service_type: '' })
                setSelectedAgents([])
                setShowForm(true)
              }}
              className="flex items-center gap-2 h-9 px-4 bg-[#6366F1] text-white text-[13px] font-semibold rounded-[8px] hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouvelle mission
            </button>
          }
        />

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-[8px] border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition-colors"
              onClick={() => setCurrentWeekStart(d => addDays(d, -7))}
            >
              <ChevronLeft className="w-4 h-4 text-[#475569]" />
            </button>
            <span className="text-[15px] font-bold text-[#0F172A] px-2">
              Semaine du {format(currentWeekStart, 'd MMMM yyyy', { locale: fr })}
            </span>
            <button
              className="w-8 h-8 rounded-[8px] border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition-colors"
              onClick={() => setCurrentWeekStart(d => addDays(d, 7))}
            >
              <ChevronRight className="w-4 h-4 text-[#475569]" />
            </button>
            <button
              className="text-[12px] text-[#6366F1] font-medium hover:underline ml-1"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Aujourd'hui
            </button>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] bg-white">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {Object.entries(MISSION_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar header: day labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div key={idx} className="text-center">
                <p className={cn('text-[12px] font-bold uppercase', isToday ? 'text-[#6366F1]' : 'text-[#94A3B8]')}>
                  {dayNames[idx]}
                </p>
                <p className={cn('text-[18px] font-bold mt-0.5', isToday ? 'text-[#6366F1]' : 'text-[#0F172A]')}>
                  {format(day, 'd')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map((day, idx) => {
              const dayMissions = getMissionsForDay(day)
              const isToday = isSameDay(day, new Date())
              return (
                <div key={idx} className={cn(
                  'border-r border-[#F1F5F9] last:border-0 min-h-[500px] p-2',
                  isToday && 'bg-[#EEF2FF]/30'
                )}>
                  {dayMissions.map(mission => (
                    <div
                      key={mission.id}
                      className="mb-2 p-2.5 rounded-[8px] border-l-[3px] bg-[#EEF2FF] border-l-[#6366F1] hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      <p className="text-[12px] font-semibold text-[#0F172A] truncate">{mission.client?.name}</p>
                      {mission.start_time && (
                        <p className="text-[11px] text-[#6366F1] font-medium mt-0.5">{mission.start_time}</p>
                      )}
                      {mission.agents && mission.agents.length > 0 && (
                        <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                          {mission.agents.map(a => `${a.first_name} ${a.last_name[0]}.`).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                  {dayMissions.length === 0 && (
                    <div className="flex items-center justify-center h-full text-[#94A3B8] text-[12px]">
                      —
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* List view below calendar */}
        <div className="mt-8">
          <h2 className="text-[15px] font-bold text-[#0F172A] mb-4">Toutes les missions</h2>
          <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden divide-y divide-[#F1F5F9]">
            {missions
              .filter(m => filterStatus === 'all' || m.status === filterStatus)
              .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
              .map(mission => (
                <div key={mission.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-[13px] font-bold text-[#0F172A]">{formatDate(mission.scheduled_date)}</p>
                      {mission.start_time && <p className="text-[11px] text-[#94A3B8]">{mission.start_time}</p>}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0F172A]">{mission.client?.name}</p>
                      <p className="text-[11px] text-[#475569]">{mission.site?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[12px] text-[#475569]">
                      <Clock className="w-3 h-3 text-[#94A3B8]" /> {mission.planned_hours}h
                    </div>
                    <div className="flex items-center gap-1 text-[12px] text-[#475569]">
                      <Users className="w-3 h-3 text-[#94A3B8]" /> {mission.agents?.length || 0}
                    </div>
                    <StatusBadge status={mission.status} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Create mission form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-bold text-[#0F172A]">Planifier une mission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v, site_id: '' }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] w-full">
                  <SelectValue placeholder="Choisir un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Site *</Label>
              <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] w-full">
                  <SelectValue placeholder="Choisir un site..." />
                </SelectTrigger>
                <SelectContent>
                  {clientSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-[#F1F5F9] pt-4 mt-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Date *</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] w-full" />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Heure</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] w-full" />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Durée (h)</Label>
                <Input type="number" min="0.5" step="0.5" value={form.planned_hours} onChange={e => setForm(f => ({ ...f, planned_hours: e.target.value }))} className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] w-full" />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Protocole SOP</Label>
              <Select value={form.sop_id} onValueChange={v => setForm(f => ({ ...f, sop_id: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] w-full"><SelectValue placeholder="Optionnel..." /></SelectTrigger>
                <SelectContent>
                  {sops.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Agents</Label>
              <div className="space-y-2 border border-[#E2E8F0] rounded-[8px] p-3">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <Checkbox id={`plan-${agent.id}`} checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={(checked) => setSelectedAgents(prev => checked ? [...prev, agent.id] : prev.filter(id => id !== agent.id))} />
                    <label htmlFor={`plan-${agent.id}`} className="text-[13px] cursor-pointer flex-1 text-[#0F172A]">
                      {agent.first_name} {agent.last_name}
                    </label>
                    <StatusBadge status={agent.status} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569] mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] w-full" />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowForm(false)}
              className="h-9 px-4 text-[13px] font-medium text-[#475569] border border-[#E2E8F0] rounded-[8px] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="h-9 px-4 text-[13px] font-semibold text-white bg-[#6366F1] rounded-[8px] hover:bg-indigo-700 transition-colors"
            >
              Planifier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
