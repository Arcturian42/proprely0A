'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/lib/store'
import { Agent, AgentStatus, ContractType } from '@/types'
import {
  AGENT_STATUS_LABELS, CONTRACT_TYPE_LABELS, DAYS_KEYS, DAYS_FR,
  FATIGUE_LABEL_COLORS, FATIGUE_LABEL_TEXT, EXPERTISE_LABELS, SKILL_LEVEL_COLORS,
} from '@/lib/constants'
import { computeFatigueScore, computeWeeklySummary } from '@/lib/workload'
import { cn, initials } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Phone, MapPin, Sparkles, Eye, Users, Activity, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { startOfWeek } from 'date-fns'
import { AgentProfilePanel } from './_components/AgentProfilePanel'
import { Can } from '@/components/auth/Can'
import { EmptyState } from '@/components/shared/EmptyState'

const defaultForm = {
  first_name: '', last_name: '', phone: '', email: '', specialty: '',
  business_registration_number: '', contract_type: 'cdi' as ContractType,
  weekly_availability_hours: '35', zone: '', status: 'disponible' as AgentStatus,
  hourly_cost: '', notes: '', skills: '',
  weekly_availability: { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false },
}

export default function AgentsPage() {
  useEffect(() => { document.title = 'Agents — Proprely' }, [])
  const { agents, missions, agentSkills, addAgent, updateAgent, deleteAgent } = useAppStore()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterExpertise, setFilterExpertise] = useState<string>('all')
  const [filterContract, setFilterContract] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [profileAgentId, setProfileAgentId] = useState<string | null>(null)

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])

  const enriched = useMemo(() => agents.map(a => {
    const summary = computeWeeklySummary(a, missions, weekStart)
    const fatigue = computeFatigueScore(a, missions)
    const skillsForAgent = agentSkills.filter(s => s.agent_id === a.id)
    return { agent: a, summary, fatigue, skills: skillsForAgent }
  }), [agents, missions, weekStart, agentSkills])

  const filtered = useMemo(() => enriched.filter(({ agent, skills }) => {
    const matchSearch = `${agent.first_name} ${agent.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (agent.zone || '').toLowerCase().includes(search.toLowerCase()) ||
      (agent.specialty || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || agent.status === filterStatus
    const matchContract = filterContract === 'all' || agent.contract_type === filterContract
    const allSkills = new Set<string>([...(agent.skills ?? []), ...skills.map(s => s.skill)])
    const matchExp = filterExpertise === 'all' || allSkills.has(filterExpertise)
    return matchSearch && matchStatus && matchContract && matchExp
  }), [enriched, search, filterStatus, filterContract, filterExpertise])

  // Stats
  const totalActive = agents.filter(a => a.status === 'disponible' || a.status === 'occupe').length
  const overloaded = enriched.filter(e => e.summary.loadRatio > 1).length
  const burnoutRisk = enriched.filter(e => e.fatigue.label === 'surcharge' || e.fatigue.label === 'burnout').length
  const totalCapacity = agents.reduce((s, a) => s + a.weekly_availability_hours, 0)
  const totalUsed = enriched.reduce((s, e) => s + e.summary.weeklyHours, 0)

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

  const profileAgent = profileAgentId ? agents.find(a => a.id === profileAgentId) : null

  return (
    <AdminLayout>
      <div className="p-6 bg-slate-50 min-h-full">
        <PageHeader
          title="Agents d'entretien"
          description="Workforce management — expertise, charge, fatigue et disponibilité"
          action={
            <Can permission="agent:write">
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="w-4 h-4" /> Nouvel agent
              </Button>
            </Can>
          }
        />

        {/* Stats globales */}
        <div className="grid grid-cols-4 gap-3 mb-5 mt-4">
          <KpiCard icon={Users} label="Agents actifs" value={totalActive} tint="indigo" />
          <KpiCard
            icon={Activity}
            label="Charge équipe"
            value={Math.round((totalUsed / Math.max(1, totalCapacity)) * 100)}
            suffix="%"
            tint="violet"
          />
          <KpiCard icon={Clock} label="Surchargés" value={overloaded} tint={overloaded > 0 ? 'amber' : 'emerald'} />
          <KpiCard icon={AlertTriangle} label="Risque burnout" value={burnoutRisk} tint={burnoutRisk > 0 ? 'rose' : 'emerald'} />
        </div>

        {/* Filtres */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Nom, zone, spécialité…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContract} onValueChange={setFilterContract}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Contrat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous contrats</SelectItem>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterExpertise} onValueChange={setFilterExpertise}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Expertise" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes expertises</SelectItem>
              {Object.entries(EXPERTISE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Empty state pour les entreprises qui n'ont aucun agent encore */}
        {agents.length === 0 && (
          <EmptyState
            icon={Users}
            title="Aucun agent dans l'équipe"
            description="Ajoute ton premier agent d'entretien pour pouvoir l'affecter à des missions et suivre ses heures."
            actions={[
              { label: 'Ajouter un agent', href: '#' },
            ]}
          />
        )}

        {/* Cartes agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(({ agent, summary, fatigue, skills }) => {
            const loadPct = Math.min(100, summary.loadRatio * 100)
            const overloadedAgent = summary.loadRatio > 1
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setProfileAgentId(agent.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-11 h-11 rounded-full text-white font-bold flex items-center justify-center text-sm',
                      'bg-gradient-to-br from-indigo-500 to-violet-500',
                    )}>
                      {initials(agent.first_name, agent.last_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{agent.first_name} {agent.last_name}</p>
                      <p className="text-[11px] text-slate-500">{CONTRACT_TYPE_LABELS[agent.contract_type]}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                {/* Contact rapide */}
                <div className="text-[11px] text-slate-500 mb-3 space-y-0.5">
                  {agent.phone && <p className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {agent.phone}</p>}
                  {agent.zone && <p className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {agent.zone}</p>}
                </div>

                {/* Expertises top 3 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {skills.slice(0, 3).map(s => (
                    <Badge key={s.id} className={cn('text-[10px]', SKILL_LEVEL_COLORS[s.level])}>
                      {EXPERTISE_LABELS[s.skill] ?? s.skill}
                    </Badge>
                  ))}
                  {skills.length === 0 && agent.specialty && (
                    <Badge variant="secondary" className="text-[10px]">{agent.specialty}</Badge>
                  )}
                  {skills.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{skills.length - 3}</span>
                  )}
                </div>

                {/* Workload */}
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Charge semaine</span>
                    <span className={cn('font-medium', overloadedAgent ? 'text-rose-600' : 'text-slate-700')}>
                      {summary.weeklyHours}h / {summary.capacityHours}h
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        loadPct > 100 ? 'bg-rose-500' :
                        loadPct > 85 ? 'bg-amber-500' :
                        loadPct > 60 ? 'bg-violet-500' : 'bg-emerald-500',
                      )}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                </div>

                {/* Fatigue + heatmap */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn('text-[10px]', FATIGUE_LABEL_COLORS[fatigue.label])}>
                    Forme {FATIGUE_LABEL_TEXT[fatigue.label]} · {fatigue.score}
                  </Badge>
                  <div className="flex gap-0.5">
                    {DAYS_KEYS.map((day, idx) => {
                      const isAvail = agent.weekly_availability?.[day]
                      return (
                        <div
                          key={day}
                          title={DAYS_FR[idx]}
                          className={cn(
                            'w-3 h-3 rounded-sm',
                            isAvail ? 'bg-emerald-300' : 'bg-slate-100',
                          )}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={(e) => { e.stopPropagation(); setProfileAgentId(agent.id) }}
                  >
                    <Eye className="w-3 h-3" /> Profil
                  </Button>
                  <Can permission="agent:write">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(agent) }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(agent.id) }}
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </Button>
                  </Can>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Aucun agent trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Form dialog (édition rapide infos de base) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Modifier l\'agent' : 'Nouvel agent'}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2 mb-2">
            Infos de base. Les expertises avec niveaux, certifications et indispos se gèrent depuis le profil détaillé.
          </p>
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
              <Label>N° SIRET</Label>
              <Input value={form.business_registration_number} onChange={e => setForm(f => ({ ...f, business_registration_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Compétences libres (séparées par des virgules)</Label>
              <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="Pour expertises avec niveaux, voir le profil détaillé" />
            </div>
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
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <AgentProfilePanel
        agent={profileAgent ?? null}
        open={!!profileAgent}
        onClose={() => setProfileAgentId(null)}
      />
    </AdminLayout>
  )
}

function KpiCard({
  icon: Icon, label, value, suffix, tint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  tint: 'amber' | 'indigo' | 'rose' | 'emerald' | 'violet'
}) {
  const tints = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  }[tint]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tints.bg)}>
        <Icon className={cn('w-4 h-4', tints.text)} />
      </div>
      <div>
        <p className={cn('text-xl font-bold leading-tight', tints.text)}>{value}{suffix ?? ''}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  )
}
