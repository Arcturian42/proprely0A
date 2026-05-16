'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/lib/store'
import { Agent, AgentStatus, ContractType } from '@/types'
import { AGENT_STATUS_LABELS, CONTRACT_TYPE_LABELS, DAYS_KEYS, DAYS_FR } from '@/lib/constants'

const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'

const defaultForm = {
  first_name: '', last_name: '', phone: '', email: '', specialty: '',
  business_registration_number: '', contract_type: 'cdi' as ContractType,
  weekly_availability_hours: '35', zone: '', status: 'disponible' as AgentStatus,
  hourly_cost: '', notes: '', skills: '',
  weekly_availability: { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false },
}

export default function AgentsPage() {
  useEffect(() => { document.title = 'Agents — Proprely' }, [])
  const { agents, missions, addAgent, updateAgent, deleteAgent } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [availSlots, setAvailSlots] = useState<{ day: string; start: string; end: string; enabled: boolean }[]>(
    DAYS_FULL.map(day => ({ day, enabled: false, start: '08:00', end: '17:00' }))
  )

  const initAvailSlots = useCallback((agent: typeof editingAgent) => {
    return DAYS_FULL.map(day => ({
      day,
      enabled: agent?.availability?.some(a => a.startsWith(day)) ?? false,
      start: agent?.availability?.find(a => a.startsWith(day))?.match(/(\d{2}:\d{2})-/)?.[1] ?? '08:00',
      end: agent?.availability?.find(a => a.startsWith(day))?.match(/-(\d{2}:\d{2})/)?.[1] ?? '17:00',
    }))
  }, [])

  const filtered = agents.filter(a => {
    const matchSearch = `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (a.zone || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleOpenCreate = () => {
    setEditingAgent(null)
    setForm(defaultForm)
    setAvailSlots(DAYS_FULL.map(day => ({ day, enabled: false, start: '08:00', end: '17:00' })))
    setShowForm(true)
  }

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setForm({
      first_name: agent.first_name, last_name: agent.last_name, phone: agent.phone || '',
      email: agent.email || '', specialty: agent.specialty || '',
      business_registration_number: agent.business_registration_number || '',
      contract_type: agent.contract_type, weekly_availability_hours: agent.weekly_availability_hours.toString(),
      zone: agent.zone || '', status: agent.status, hourly_cost: agent.hourly_cost?.toString() || '',
      notes: agent.notes || '', skills: agent.skills?.join(', ') || '',
      weekly_availability: { ...defaultForm.weekly_availability, ...agent.weekly_availability },
    })
    setAvailSlots(initAvailSlots(agent))
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.first_name || !form.last_name) { toast.error('Prénom et nom requis'); return }
    const hours = parseInt(form.weekly_availability_hours)
    if (isNaN(hours) || hours < 1 || hours > 60) { toast.error('Heures/semaine doit être entre 1 et 60'); return }
    const cost = form.hourly_cost ? parseFloat(form.hourly_cost) : null
    if (cost !== null && cost < 0) { toast.error('Le coût horaire ne peut pas être négatif'); return }
    const phoneRegex = /^0[1-9][0-9]{8}$/
    if (form.phone && !phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      toast.error('Téléphone invalide — format attendu: 06 12 34 56 78')
      return
    }
    if (['auto_entrepreneur', 'sous_traitant'].includes(form.contract_type)) {
      if (!form.business_registration_number) {
        toast.error('Le SIRET est obligatoire pour les auto-entrepreneurs et sous-traitants')
        return
      }
      const siret = form.business_registration_number.replace(/\s/g, '')
      if (!/^\d{14}$/.test(siret)) {
        toast.error('SIRET invalide — doit contenir 14 chiffres')
        return
      }
    }
    const availability = availSlots
      .filter(s => s.enabled)
      .map(s => `${s.day} ${s.start}-${s.end}`)
    const agentData = {
      ...form,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      weekly_availability_hours: hours,
      hourly_cost: cost,
      availability,
    }
    if (editingAgent) {
      updateAgent(editingAgent.id, { ...agentData, updated_at: new Date().toISOString() })
      toast.success('Agent mis à jour')
    } else {
      const newAgent: Agent = {
        id: crypto.randomUUID(), company_id: 'company-1', ...agentData,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addAgent(newAgent)
      toast.success('Agent créé')
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    const hasActiveMissions = missions.some(m => m.agents?.some(a => a.id === id))
    if (hasActiveMissions) {
      toast.error('Impossible de supprimer cet agent : il est affecté à des missions actives.')
      setConfirmDelete(null)
      return
    }
    deleteAgent(id)
    toast.success('Agent supprimé')
    setConfirmDelete(null)
  }

  const totalAgents = agents.length
  const disponibles = agents.filter(a => a.status === 'disponible').length
  const enConge = agents.filter(a => a.status === 'absent').length

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Agents d'entretien</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 w-56"
                placeholder="Rechercher un agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-sm font-medium flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Nouvel agent
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Agents au total', value: totalAgents },
            { label: 'Disponibles', value: disponibles },
            { label: 'En congé', value: enConge },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Agent cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 text-lg font-bold flex items-center justify-center mx-auto">
                {agent.first_name[0]}{agent.last_name[0]}
              </div>

              {/* Name */}
              <p className="text-sm font-semibold text-gray-900 text-center mt-3">
                {agent.first_name} {agent.last_name}
              </p>

              {/* Zone */}
              <p className="text-xs text-gray-400 text-center mt-0.5">
                {agent.specialty || CONTRACT_TYPE_LABELS[agent.contract_type]}{agent.zone ? ` · ${agent.zone}` : ''}
              </p>

              {/* Status badge */}
              <div className="flex justify-center mt-2">
                <StatusBadge status={agent.status} />
              </div>

              {/* Divider + info rows */}
              <div className="border-t border-gray-100 mt-4 pt-4 space-y-1.5">
                {agent.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {agent.phone}
                  </div>
                )}
                {agent.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                )}
                {agent.zone && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {agent.zone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 font-bold text-[10px] flex items-center justify-center">h</span>
                  {agent.weekly_availability_hours}h/sem · {CONTRACT_TYPE_LABELS[agent.contract_type]}
                </div>
              </div>

              {/* Skills */}
              {agent.skills && agent.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {agent.skills.map(skill => (
                    <span key={skill} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Availability days */}
              <div className="flex gap-1 mt-3">
                {DAYS_KEYS.map((day, idx) => (
                  <div
                    key={day}
                    className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-medium ${
                      agent.weekly_availability[day]
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {DAYS_FR[idx][0]}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(agent)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(agent.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">
              Aucun agent trouvé
            </div>
          )}
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#0F172A]">
              {editingAgent ? "Modifier l'agent" : 'Nouvel agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Prénom *</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Nom *</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Téléphone</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Email</label>
              <input
                type="email"
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Type de contrat</label>
              <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v as ContractType }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Statut</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as AgentStatus }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Spécialité</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Zone</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                placeholder="Ex: Paris 9e"
                value={form.zone}
                onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Heures/semaine</label>
              <input
                type="number"
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.weekly_availability_hours}
                onChange={e => setForm(f => ({ ...f, weekly_availability_hours: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Coût horaire (€)</label>
              <input
                type="number"
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.hourly_cost}
                onChange={e => setForm(f => ({ ...f, hourly_cost: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">N° SIRET / Auto-entrepreneur</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={form.business_registration_number}
                onChange={e => setForm(f => ({ ...f, business_registration_number: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Compétences (séparées par des virgules)</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                placeholder="Ex: nettoyage industriel, vitrerie"
                value={form.skills}
                onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
              />
            </div>

            {/* Weekly availability with time slots */}
            <div className="col-span-2">
              <span className="text-xs font-medium text-gray-700 mb-2 block">Disponibilités</span>
              <div className="border border-gray-100 rounded-lg px-3 py-1">
                {availSlots.map((slot, idx) => (
                  <div key={slot.day} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={e => {
                        const next = [...availSlots]
                        next[idx] = { ...next[idx], enabled: e.target.checked }
                        setAvailSlots(next)
                        // Also sync weekly_availability
                        const dayKey = DAYS_KEYS[idx]
                        setForm(f => ({ ...f, weekly_availability: { ...f.weekly_availability, [dayKey]: e.target.checked } }))
                      }}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700 w-20 flex-shrink-0">{slot.day}</span>
                    {slot.enabled && (
                      <>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={e => {
                            const next = [...availSlots]
                            next[idx] = { ...next[idx], start: e.target.value }
                            setAvailSlots(next)
                          }}
                          className="border border-gray-200 rounded-lg h-8 px-2 text-xs w-24"
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={e => {
                            const next = [...availSlots]
                            next[idx] = { ...next[idx], end: e.target.value }
                            setAvailSlots(next)
                          }}
                          className="border border-gray-200 rounded-lg h-8 px-2 text-xs w-24"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Notes</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white w-full resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <button
              onClick={handleSave}
              className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] transition-colors"
            >
              {editingAgent ? 'Mettre à jour' : 'Créer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer l'agent"
        description="Cette action est irréversible. L'agent sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </AdminLayout>
  )
}
