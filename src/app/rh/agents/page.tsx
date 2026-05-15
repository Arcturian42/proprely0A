'use client'

import { useState, useEffect } from 'react'
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

  const filtered = agents.filter(a => {
    const matchSearch = `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (a.zone || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleOpenCreate = () => {
    setEditingAgent(null)
    setForm(defaultForm)
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
    const agentData = {
      ...form,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      weekly_availability_hours: hours,
      hourly_cost: cost,
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
      <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A]">Agents d'entretien</h1>
            <p className="text-[13px] text-[#94A3B8] mt-0.5">Gestion de votre équipe d'agents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 pl-9 pr-3 text-[13px] bg-white text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] w-56"
                placeholder="Rechercher un agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={handleOpenCreate}
              className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvel agent
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'AGENTS AU TOTAL', value: totalAgents },
            { label: 'DISPONIBLES', value: disponibles },
            { label: 'EN CONGÉ', value: enConge },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-[12px] border border-[#E2E8F0] p-4 text-center">
              <p className="text-[24px] font-bold text-[#0F172A]">{stat.value}</p>
              <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Agent cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all"
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-[#6366F1] text-[18px] font-bold flex items-center justify-center mx-auto">
                {agent.first_name[0]}{agent.last_name[0]}
              </div>

              {/* Name */}
              <p className="text-[15px] font-bold text-[#0F172A] text-center mt-3">
                {agent.first_name} {agent.last_name}
              </p>

              {/* Role / zone */}
              <p className="text-[12px] text-[#94A3B8] text-center mt-0.5">
                {agent.specialty || CONTRACT_TYPE_LABELS[agent.contract_type]}{agent.zone ? ` · ${agent.zone}` : ''}
              </p>

              {/* Status badge */}
              <div className="flex justify-center mt-2">
                <StatusBadge status={agent.status} />
              </div>

              {/* Divider */}
              <div className="border-t border-[#F1F5F9] mt-4 pt-4">
                {/* Info rows */}
                <div className="space-y-1.5">
                  {agent.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                      <Phone className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                      {agent.phone}
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                      <span className="truncate">{agent.email}</span>
                    </div>
                  )}
                  {agent.zone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                      <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                      {agent.zone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-[#94A3B8] font-bold text-[10px]">h</span>
                    {agent.weekly_availability_hours}h/sem · {CONTRACT_TYPE_LABELS[agent.contract_type]}
                  </div>
                </div>

                {/* Skills */}
                {agent.skills && agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agent.skills.map(skill => (
                      <span key={skill} className="text-[10px] bg-[#EEF2FF] text-[#6366F1] px-2 py-0.5 rounded-full font-medium">
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
                          ? 'bg-[#EEF2FF] text-[#6366F1]'
                          : 'bg-[#F8FAFC] text-[#94A3B8]'
                      }`}
                    >
                      {DAYS_FR[idx][0]}
                    </div>
                  ))}
                </div>

                {/* Bottom actions */}
                <div className="mt-4 flex justify-end gap-1">
                  <button
                    onClick={() => handleOpenEdit(agent)}
                    className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(agent.id)}
                    className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-16 text-[#94A3B8] text-[13px]">
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

            {/* Weekly availability */}
            <div className="col-span-2">
              <label className="text-[12px] font-semibold text-[#475569] mb-2 block">Disponibilités hebdomadaires</label>
              <div className="flex gap-2">
                {DAYS_KEYS.map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#94A3B8]">{DAYS_FR[idx]}</span>
                    <Checkbox
                      checked={(form.weekly_availability as Record<string, boolean>)[day] || false}
                      onCheckedChange={(checked) => setForm(f => ({
                        ...f, weekly_availability: { ...f.weekly_availability, [day]: !!checked }
                      }))}
                    />
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
