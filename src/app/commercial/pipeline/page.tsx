'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAppStore, computeDevisTotal } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Devis, DevisLine, Facture, Opportunity, OpportunityStage, Task } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, DEVIS_STATUS_LABELS, FACTURE_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus, Phone, Mail, MapPin, Euro, CheckCircle2,
  X, Building2, User, FileText, ClipboardList, Receipt,
  Activity, Pencil, Trash2, ArrowRight, Circle,
} from 'lucide-react'
import { toast } from 'sonner'

const STAGES: OpportunityStage[] = ['lead', 'prise_de_contact', 'decouverte', 'proposition', 'negociation', 'gagnee', 'perdue']

const STAGE_COLORS: Record<OpportunityStage, string> = {
  lead: 'border-t-slate-400',
  prise_de_contact: 'border-t-blue-400',
  decouverte: 'border-t-indigo-400',
  proposition: 'border-t-violet-400',
  negociation: 'border-t-amber-400',
  gagnee: 'border-t-green-500',
  perdue: 'border-t-red-400',
}

const STAGE_SUCCESS: Record<OpportunityStage, number> = {
  lead: 10, prise_de_contact: 20, decouverte: 40,
  proposition: 60, negociation: 80, gagnee: 100, perdue: 0,
}

const defaultForm = {
  title: '', prospect_name: '', contact_name: '', email: '', phone: '',
  city: '', site_address: '', client_type: '', service_type: '',
  estimated_amount: '', stage: 'lead' as OpportunityStage, next_action_date: '', notes: '',
}

function generateRef(opp: Opportunity): string {
  const initials = opp.prospect_name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
  const year = new Date(opp.created_at).getFullYear()
  const num = String(parseInt(opp.id.replace(/\D/g, '').slice(-4) || '1', 10)).padStart(3, '0')
  return `${initials}-${year}-${num}`
}

const emptyDevisLine = (): DevisLine => ({
  id: `line-${Date.now()}-${Math.random()}`, description: '', quantity: 1, unit_price: 0, tva_rate: 20,
})

export default function PipelinePage() {
  useEffect(() => { document.title = 'Pipeline — Proprely' }, [])
  const {
    opportunities, addOpportunity, updateOpportunity, deleteOpportunity, winOpportunity,
    devis, addDevis, updateDevis, deleteDevis, convertDevisToFacture,
    factures, updateFacture,
    tasks, addTask, updateTask, deleteTask,
  } = useAppStore()

  const [showForm, setShowForm] = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Devis quick-add
  const [showDevisForm, setShowDevisForm] = useState(false)
  const [devisTitle, setDevisTitle] = useState('')
  const [devisLines, setDevisLines] = useState<DevisLine[]>([emptyDevisLine()])

  // Task quick-add
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskPriority, setTaskPriority] = useState<'basse' | 'normale' | 'haute'>('normale')

  const handleOpenCreate = () => { setEditingOpp(null); setForm(defaultForm); setShowForm(true) }
  const handleOpenEdit = (opp: Opportunity) => {
    setEditingOpp(opp)
    setForm({
      title: opp.title, prospect_name: opp.prospect_name,
      contact_name: opp.contact_name || '', email: opp.email || '',
      phone: opp.phone || '', city: opp.city || '',
      site_address: opp.site_address || '', client_type: opp.client_type || '',
      service_type: opp.service_type || '',
      estimated_amount: opp.estimated_amount?.toString() || '',
      stage: opp.stage,
      next_action_date: opp.next_action_date ? opp.next_action_date.split('T')[0] : '',
      notes: opp.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title || !form.prospect_name) { toast.error('Titre et nom du prospect requis'); return }
    const now = new Date().toISOString()
    if (editingOpp) {
      updateOpportunity(editingOpp.id, {
        ...form,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
        updated_at: now,
      })
      toast.success('Opportunité mise à jour')
    } else {
      addOpportunity({
        id: `opp-${Date.now()}`, company_id: 'company-1',
        lead_id: null, client_id: null, site_id: null,
        ...form,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
        status: 'ouvert', converted_to_client: false, converted_at: null,
        created_at: now, updated_at: now,
      })
      toast.success('Opportunité créée')
    }
    setShowForm(false)
  }

  const handleMoveStage = (opp: Opportunity, newStage: OpportunityStage) => {
    if (newStage === 'gagnee' && !opp.converted_to_client) {
      winOpportunity(opp.id)
      toast.success(`Opportunité gagnée ! Client "${opp.prospect_name}" créé automatiquement.`, { duration: 5000 })
    } else {
      updateOpportunity(opp.id, { stage: newStage, updated_at: new Date().toISOString() })
    }
  }

  const handleDelete = (id: string) => {
    deleteOpportunity(id); setSelectedOpp(null); setConfirmDelete(null)
    toast.success('Opportunité supprimée')
  }

  const handleAddDevis = () => {
    if (!devisTitle || !selectedOpp) { toast.error('Titre requis'); return }
    if (devisLines.some(l => !l.description)) { toast.error('Remplissez toutes les descriptions'); return }
    const now = new Date().toISOString()
    const year = new Date().getFullYear()
    const oppDevis = devis.filter(d => d.opportunity_id === selectedOpp.id)
    const newDevis: Devis = {
      id: `devis-${Date.now()}`, company_id: 'company-1',
      number: `DEV-${year}-${String(devis.length + 1).padStart(3, '0')}`,
      opportunity_id: selectedOpp.id,
      client_id: selectedOpp.client_id,
      site_id: selectedOpp.site_id,
      title: devisTitle,
      lines: devisLines,
      tva_rate: 20,
      status: 'brouillon',
      valid_until: null, notes: null,
      created_at: now, updated_at: now,
    }
    addDevis(newDevis)
    setDevisTitle(''); setDevisLines([emptyDevisLine()]); setShowDevisForm(false)
    toast.success('Devis créé')
  }

  const handleAddTask = () => {
    if (!taskTitle || !selectedOpp) { toast.error('Titre requis'); return }
    const now = new Date().toISOString()
    const newTask: Task = {
      id: `task-${Date.now()}`, company_id: 'company-1',
      opportunity_id: selectedOpp.id, client_id: null, mission_id: null,
      title: taskTitle, description: null,
      due_date: taskDue || null,
      completed: false, completed_at: null,
      priority: taskPriority,
      created_at: now, updated_at: now,
    }
    addTask(newTask)
    setTaskTitle(''); setTaskDue(''); setTaskPriority('normale'); setShowTaskForm(false)
    toast.success('Tâche ajoutée')
  }

  const oppsByStage = (stage: OpportunityStage) => opportunities.filter(o => o.stage === stage)
  const successPct = selectedOpp ? STAGE_SUCCESS[selectedOpp.stage] : 0

  const oppDevis = selectedOpp ? devis.filter(d => d.opportunity_id === selectedOpp.id) : []
  const oppFactures = selectedOpp ? factures.filter(f => f.opportunity_id === selectedOpp.id) : []
  const oppTasks = selectedOpp ? tasks.filter(t => t.opportunity_id === selectedOpp.id) : []

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Pipeline commercial"
          description="Suivi de vos opportunités par étape"
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouvelle opportunité
            </Button>
          }
        />

        {/* Kanban board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const opps = oppsByStage(stage)
            const total = opps.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)
            return (
              <div key={stage} className="flex-shrink-0 w-72">
                <div className={`bg-white rounded-xl border-t-4 shadow-sm ${STAGE_COLORS[stage]} border border-slate-200 mb-3`}>
                  <div className="p-3 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800">{OPPORTUNITY_STAGE_LABELS[stage]}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{opps.length}</span>
                  </div>
                  {total > 0 && <div className="px-3 pb-2 text-xs text-slate-500">{formatCurrency(total)}</div>}
                </div>
                <div className="space-y-3">
                  {opps.map(opp => (
                    <Card
                      key={opp.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedOpp(opp)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOpp(opp) } }}
                    >
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm text-slate-900 mb-1">{opp.title}</p>
                        <p className="text-xs text-slate-500 mb-2">{opp.prospect_name}</p>
                        {opp.estimated_amount && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                            <Euro className="w-3 h-3" />{formatCurrency(opp.estimated_amount)}
                          </div>
                        )}
                        {opp.city && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />{opp.city}
                          </div>
                        )}
                        {opp.next_action_date && (
                          <p className="text-xs text-amber-600 mt-2">Action: {formatDate(opp.next_action_date)}</p>
                        )}
                        {opp.converted_to_client && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                            <CheckCircle2 className="w-3 h-3" /> Converti en client
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {opps.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                      <p className="text-xs text-slate-400">Aucune opportunité</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${selectedOpp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSelectedOpp(null)}
      />

      {/* Slide-in panel */}
      <div className={`fixed top-0 right-0 h-full z-50 w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${selectedOpp ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedOpp && (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900 leading-tight">{selectedOpp.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ref: #{generateRef(selectedOpp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Valeur</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedOpp.estimated_amount ? formatCurrency(selectedOpp.estimated_amount) : '—'}
                  </p>
                </div>
                <StatusBadge status={selectedOpp.stage} />
              </div>
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] text-slate-400">Probabilité de succès</span>
                  <span className="text-[11px] font-semibold text-slate-600">{successPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${successPct === 100 ? 'bg-green-500' : successPct === 0 ? 'bg-red-400' : successPct >= 60 ? 'bg-blue-500' : 'bg-blue-400'}`}
                    style={{ width: `${successPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="prospect" className="flex flex-col flex-1 min-h-0">
              <div className="px-5 pt-3 border-b border-slate-100 flex-shrink-0">
                <TabsList className="bg-transparent h-auto p-0 gap-0 w-full justify-start rounded-none">
                  {[
                    { value: 'prospect', label: 'Prospect', icon: User },
                    { value: 'activite', label: 'Activité', icon: Activity },
                    { value: 'devis', label: `Devis${oppDevis.length ? ` (${oppDevis.length})` : ''}`, icon: FileText },
                    { value: 'taches', label: `Tâches${oppTasks.length ? ` (${oppTasks.length})` : ''}`, icon: ClipboardList },
                    { value: 'facture', label: `Factures${oppFactures.length ? ` (${oppFactures.length})` : ''}`, icon: Receipt },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value} value={value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-2.5 pb-2 pt-1 text-xs font-medium text-slate-500 gap-1"
                    >
                      <Icon className="w-3.5 h-3.5" />{label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* ── Prospect ── */}
                <TabsContent value="prospect" className="m-0 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact principal</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900">{selectedOpp.contact_name || selectedOpp.prospect_name}</p>
                        {selectedOpp.client_type && <p className="text-xs text-slate-400 capitalize">{selectedOpp.client_type}</p>}
                      </div>
                      <div className="flex gap-1">
                        {selectedOpp.email && (
                          <a href={`mailto:${selectedOpp.email}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {selectedOpp.phone && (
                          <a href={`tel:${selectedOpp.phone}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedOpp.email && (
                      <div className="col-span-2 bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-0.5">Email</p>
                        <p className="text-sm text-slate-700 truncate">{selectedOpp.email}</p>
                      </div>
                    )}
                    {selectedOpp.phone && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-0.5">Téléphone</p>
                        <p className="text-sm text-slate-700">{selectedOpp.phone}</p>
                      </div>
                    )}
                    {selectedOpp.city && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-0.5">Ville</p>
                        <p className="text-sm text-slate-700">{selectedOpp.city}</p>
                      </div>
                    )}
                    {selectedOpp.service_type && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-0.5">Type de service</p>
                        <p className="text-sm text-slate-700 capitalize">{selectedOpp.service_type}</p>
                      </div>
                    )}
                    {selectedOpp.site_address && (
                      <div className="col-span-2 bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-0.5">Adresse du site</p>
                        <p className="text-sm text-slate-700">{selectedOpp.site_address}</p>
                      </div>
                    )}
                  </div>
                  {selectedOpp.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-amber-600 mb-1">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedOpp.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => { setSelectedOpp(null); handleOpenEdit(selectedOpp) }}>
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setConfirmDelete(selectedOpp.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Activité ── */}
                <TabsContent value="activite" className="m-0 p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Historique</p>
                  <div className="relative">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-100" />
                    <div className="space-y-5 pl-7">
                      {selectedOpp.next_action_date && (
                        <div className="relative">
                          <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                          <p className="text-xs font-semibold text-slate-800">Prochaine action prévue</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedOpp.next_action_date)}</p>
                        </div>
                      )}
                      <div className="relative">
                        <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                        <p className="text-xs font-semibold text-slate-800">Étape : {OPPORTUNITY_STAGE_LABELS[selectedOpp.stage]}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Mis à jour le {formatDate(selectedOpp.updated_at)}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white" />
                        <p className="text-xs font-semibold text-slate-800">Opportunité créée</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedOpp.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Changer l&apos;étape</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.filter(s => s !== selectedOpp.stage && s !== 'perdue' && s !== 'gagnee').map(s => (
                        <Button key={s} variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => { handleMoveStage(selectedOpp, s); setSelectedOpp(prev => prev ? { ...prev, stage: s } : null) }}>
                          {OPPORTUNITY_STAGE_LABELS[s]}
                        </Button>
                      ))}
                      {!selectedOpp.converted_to_client && (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-xs h-7"
                          onClick={() => { winOpportunity(selectedOpp.id); toast.success(`Opportunité gagnée !`, { duration: 4000 }); setSelectedOpp(null) }}>
                          <CheckCircle2 className="w-3 h-3" /> Marquer Gagnée
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ── Devis ── */}
                <TabsContent value="devis" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Devis</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowDevisForm(true)}>
                      <Plus className="w-3 h-3" /> Nouveau
                    </Button>
                  </div>

                  {showDevisForm && (
                    <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 mb-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-700">Nouveau devis</p>
                      <div>
                        <Label className="text-xs">Titre *</Label>
                        <Input value={devisTitle} onChange={e => setDevisTitle(e.target.value)} placeholder="Ex: Nettoyage mensuel" className="h-8 text-xs mt-1" />
                      </div>
                      {devisLines.map((line, idx) => (
                        <div key={line.id} className="grid grid-cols-12 gap-1 items-center">
                          <div className="col-span-5">
                            <Input value={line.description} onChange={e => setDevisLines(ls => ls.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} placeholder="Description" className="h-7 text-xs" />
                          </div>
                          <div className="col-span-2">
                            <Input type="number" value={line.quantity} onChange={e => setDevisLines(ls => ls.map((l, i) => i === idx ? { ...l, quantity: parseFloat(e.target.value) || 1 } : l))} className="h-7 text-xs" placeholder="Qté" />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" value={line.unit_price} onChange={e => setDevisLines(ls => ls.map((l, i) => i === idx ? { ...l, unit_price: parseFloat(e.target.value) || 0 } : l))} className="h-7 text-xs" placeholder="PU €" />
                          </div>
                          <div className="col-span-1 text-xs text-slate-500 text-right">{formatCurrency(line.quantity * line.unit_price)}</div>
                          <div className="col-span-1">
                            {devisLines.length > 1 && (
                              <button onClick={() => setDevisLines(ls => ls.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-400">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-slate-500" onClick={() => setDevisLines(ls => [...ls, emptyDevisLine()])}>
                        <Plus className="w-3 h-3" /> Ligne
                      </Button>
                      <div className="text-right text-xs font-semibold text-slate-700">
                        Total HT: {formatCurrency(devisLines.reduce((s, l) => s + l.quantity * l.unit_price, 0))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setShowDevisForm(false); setDevisTitle(''); setDevisLines([emptyDevisLine()]) }}>Annuler</Button>
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddDevis}>Créer</Button>
                      </div>
                    </div>
                  )}

                  {oppDevis.length === 0 && !showDevisForm ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">Aucun devis pour cette opportunité</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {oppDevis.map(d => {
                        const { total } = computeDevisTotal(d.lines, d.tva_rate)
                        return (
                          <div key={d.id} className="bg-slate-50 rounded-lg p-3 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-slate-400">{d.number}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${d.status === 'accepte' ? 'bg-green-100 text-green-700' : d.status === 'refuse' ? 'bg-red-100 text-red-600' : d.status === 'envoye' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {DEVIS_STATUS_LABELS[d.status]}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800 truncate">{d.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(total)} TTC</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {d.status === 'brouillon' && (
                                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                                  onClick={() => { updateDevis(d.id, { status: 'envoye', updated_at: new Date().toISOString() }); toast.success('Devis envoyé') }}>
                                  Envoyer
                                </Button>
                              )}
                              {d.status === 'envoye' && (
                                <>
                                  <Button size="sm" className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700"
                                    onClick={() => { updateDevis(d.id, { status: 'accepte', updated_at: new Date().toISOString() }); toast.success('Accepté') }}>
                                    Accepter
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 border-red-200"
                                    onClick={() => { updateDevis(d.id, { status: 'refuse', updated_at: new Date().toISOString() }); toast.success('Refusé') }}>
                                    Refuser
                                  </Button>
                                </>
                              )}
                              {d.status === 'accepte' && (
                                <Button size="sm" className="h-6 text-[10px] px-2 gap-1 bg-blue-600 hover:bg-blue-700"
                                  onClick={() => { convertDevisToFacture(d.id); toast.success('Converti en facture') }}>
                                  <ArrowRight className="w-2.5 h-2.5" />Facturer
                                </Button>
                              )}
                              <button onClick={() => { deleteDevis(d.id); toast.success('Devis supprimé') }} className="text-slate-300 hover:text-red-400 p-1">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ── Tâches ── */}
                <TabsContent value="taches" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tâches</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowTaskForm(true)}>
                      <Plus className="w-3 h-3" /> Nouvelle
                    </Button>
                  </div>

                  {showTaskForm && (
                    <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 mb-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-700">Nouvelle tâche</p>
                      <div>
                        <Label className="text-xs">Titre *</Label>
                        <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Ex: Envoyer le devis" className="h-8 text-xs mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Échéance</Label>
                          <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="h-8 text-xs mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Priorité</Label>
                          <Select value={taskPriority} onValueChange={v => setTaskPriority(v as typeof taskPriority)}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basse">Basse</SelectItem>
                              <SelectItem value="normale">Normale</SelectItem>
                              <SelectItem value="haute">Haute</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setShowTaskForm(false); setTaskTitle('') }}>Annuler</Button>
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddTask}>Ajouter</Button>
                      </div>
                    </div>
                  )}

                  {oppTasks.length === 0 && !showTaskForm ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">Aucune tâche pour cette opportunité</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {oppTasks.map(t => (
                        <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${t.completed ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                          <button
                            onClick={() => updateTask(t.id, { completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${t.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-blue-400'}`}
                          >
                            {t.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {t.due_date && <span className="text-[10px] text-slate-400">{formatDate(t.due_date)}</span>}
                              <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${t.priority === 'haute' ? 'bg-red-100 text-red-600' : t.priority === 'normale' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                {t.priority}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => deleteTask(t.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Factures ── */}
                <TabsContent value="facture" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Factures</p>
                  </div>
                  {oppFactures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                        <Receipt className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">Aucune facture</p>
                      <p className="text-[11px] text-slate-400 mt-1">Acceptez un devis et cliquez sur &quot;Facturer&quot; pour en créer une</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {oppFactures.map(f => {
                        const { total } = computeDevisTotal(f.lines, f.tva_rate)
                        const isOverdue = f.status === 'envoyee' && f.due_date && new Date(f.due_date) < new Date()
                        return (
                          <div key={f.id} className={`rounded-lg p-3 border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400">{f.number}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${f.status === 'payee' ? 'bg-green-100 text-green-700' : f.status === 'retard' || isOverdue ? 'bg-red-100 text-red-700' : f.status === 'envoyee' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {isOverdue && f.status === 'envoyee' ? 'En retard' : FACTURE_STATUS_LABELS[f.status]}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-900">{formatCurrency(total)}</span>
                            </div>
                            <p className="text-xs text-slate-700 truncate">{f.title}</p>
                            {f.due_date && <p className={`text-[10px] mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>Échéance: {formatDate(f.due_date)}</p>}
                            {(f.status === 'envoyee' || f.status === 'retard' || isOverdue) && (
                              <Button size="sm" className="mt-2 h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 gap-1"
                                onClick={() => { updateFacture(f.id, { status: 'payee', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }); toast.success('Facture payée !') }}>
                                <CheckCircle2 className="w-2.5 h-2.5" /> Marquer payée
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </div>

      {/* Create/Edit form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOpp ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux - Société X" />
              </div>
              <div className="col-span-2">
                <Label>Nom du prospect *</Label>
                <Input value={form.prospect_name} onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))} placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nom complet" />
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
                <Label>Ville</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label>Montant estimé (€)</Label>
                <Input type="number" value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} />
              </div>
              <div>
                <Label>Étape</Label>
                <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v as OpportunityStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prochaine action</Label>
                <Input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} />
              </div>
              <div>
                <Label>Type client</Label>
                <Select value={form.client_type} onValueChange={(v) => setForm(f => ({ ...f, client_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                    <SelectItem value="professionnel">Professionnel libéral</SelectItem>
                    <SelectItem value="syndic">Syndic</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingOpp ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer l'opportunité"
        description="Cette action est irréversible. L'opportunité sera définitivement supprimée."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </AdminLayout>
  )
}
