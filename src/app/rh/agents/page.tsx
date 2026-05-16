'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/lib/store'
import { AgentStatus, ContractType } from '@/types'
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
  const { agents, missions, addAgent, updateAgent, deleteAgent, companyId } = useAppStore()
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
      await updateAgent(editingAgent.id, { ...agentData })
      toast.success('Agent mis à jour')
    } else {
      if (!companyId) { toast.error('Données non chargées'); return }
      await addAgent({ company_id: companyId, ...agentData })
      toast.success('Agent créé')
    }
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    const hasActiveMissions = missions.some(m => m.agents?.some(a => a.id === id))
    if (hasActiveMissions) {
      toast.error('Impossible de supprimer cet agent : il est affecté à des missions actives.')
      setConfirmDelete(null)
      return
    }
    await deleteAgent(id)
    toast.success('Agent supprimé')
    setConfirmDelete(null)
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Agents d'entretien"
          description="Gestion de votre équipe d'agents"
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouvel agent
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['disponible', 'occupe', 'absent', 'inactif'] as AgentStatus[]).map(status => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{agents.filter(a => a.status === status).length}</p>
                <StatusBadge status={status} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Agent cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {agent.first_name[0]}{agent.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{agent.first_name} {agent.last_name}</p>
                      <p className="text-xs text-slate-500">{CONTRACT_TYPE_LABELS[agent.contract_type]}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-3">
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-400" /> {agent.phone}
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{agent.email}</span>
                    </div>
                  )}
                  {agent.zone && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" /> {agent.zone}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  {agent.specialty && <Badge variant="secondary" className="text-xs">{agent.specialty}</Badge>}
                  {agent.hourly_cost && (
                    <Badge variant="outline" className="text-xs">{agent.hourly_cost} €/h</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{agent.weekly_availability_hours}h/sem</Badge>
                </div>

                {/* Availability days */}
                <div className="flex gap-1 mb-3">
                  {DAYS_KEYS.map((day, idx) => (
                    <div key={day} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${agent.weekly_availability[day] ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                      {DAYS_FR[idx][0]}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(agent)}>
                    <Edit className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(agent.id)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">Aucun agent trouvé</div>
          )}
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Modifier l\'agent' : 'Nouvel agent'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Type de contrat</Label>
              <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v as ContractType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as AgentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Spécialité</Label>
              <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>
            <div>
              <Label>Zone</Label>
              <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ex: Paris 9e" />
            </div>
            <div>
              <Label>Heures/semaine</Label>
              <Input type="number" value={form.weekly_availability_hours} onChange={e => setForm(f => ({ ...f, weekly_availability_hours: e.target.value }))} />
            </div>
            <div>
              <Label>Coût horaire (€)</Label>
              <Input type="number" value={form.hourly_cost} onChange={e => setForm(f => ({ ...f, hourly_cost: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>N° SIRET / Auto-entrepreneur</Label>
              <Input value={form.business_registration_number} onChange={e => setForm(f => ({ ...f, business_registration_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Compétences (séparées par des virgules)</Label>
              <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="Ex: nettoyage industriel, vitrerie" />
            </div>

            {/* Weekly availability */}
            <div className="col-span-2">
              <Label className="mb-2 block">Disponibilités hebdomadaires</Label>
              <div className="flex gap-2">
                {DAYS_KEYS.map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-500">{DAYS_FR[idx]}</span>
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
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingAgent ? 'Mettre à jour' : 'Créer'}</Button>
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
