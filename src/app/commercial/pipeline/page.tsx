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
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus, Phone, Mail, MapPin, Euro, CheckCircle2,
  X, Building2, User, FileText, ClipboardList, Receipt,
  Activity, Circle, Pencil, Trash2
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
  lead: 10,
  prise_de_contact: 20,
  decouverte: 40,
  proposition: 60,
  negociation: 80,
  gagnee: 100,
  perdue: 0,
}

const defaultForm = {
  title: '',
  prospect_name: '',
  contact_name: '',
  email: '',
  phone: '',
  city: '',
  site_address: '',
  client_type: '',
  service_type: '',
  estimated_amount: '',
  stage: 'lead' as OpportunityStage,
  next_action_date: '',
  notes: '',
}

function generateRef(opp: Opportunity): string {
  const initials = opp.prospect_name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 3)
  const year = new Date(opp.created_at).getFullYear()
  const num = String(parseInt(opp.id.replace(/\D/g, '').slice(-4) || '1', 10)).padStart(3, '0')
  return `${initials}-${year}-${num}`
}

export default function PipelinePage() {
  useEffect(() => { document.title = 'Pipeline — Proprely' }, [])
  const { opportunities, addOpportunity, updateOpportunity, deleteOpportunity, winOpportunity } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditingOpp(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const handleOpenEdit = (opp: Opportunity) => {
    setEditingOpp(opp)
    setForm({
      title: opp.title,
      prospect_name: opp.prospect_name,
      contact_name: opp.contact_name || '',
      email: opp.email || '',
      phone: opp.phone || '',
      city: opp.city || '',
      site_address: opp.site_address || '',
      client_type: opp.client_type || '',
      service_type: opp.service_type || '',
      estimated_amount: opp.estimated_amount?.toString() || '',
      stage: opp.stage,
      next_action_date: opp.next_action_date ? opp.next_action_date.split('T')[0] : '',
      notes: opp.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title || !form.prospect_name) {
      toast.error('Titre et nom du prospect requis')
      return
    }

    if (editingOpp) {
      updateOpportunity(editingOpp.id, {
        ...form,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      toast.success('Opportunité mise à jour')
    } else {
      const newOpp: Opportunity = {
        id: `opp-${Date.now()}`, company_id: 'company-1',
        lead_id: null, client_id: null, site_id: null,
        ...form,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
        status: 'ouvert', converted_to_client: false, converted_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addOpportunity(newOpp)
      toast.success('Opportunité créée')
    }
    setShowForm(false)
  }

  const handleMoveStage = (opp: Opportunity, newStage: OpportunityStage) => {
    if (newStage === 'gagnee' && !opp.converted_to_client) {
      winOpportunity(opp.id)
      toast.success(`Opportunité gagnée ! Client "${opp.prospect_name}" et site créés automatiquement.`, { duration: 5000 })
    } else {
      updateOpportunity(opp.id, { stage: newStage, updated_at: new Date().toISOString() })
    }
  }

  const handleDelete = (id: string) => {
    deleteOpportunity(id)
    setSelectedOpp(null)
    setConfirmDelete(null)
    toast.success('Opportunité supprimée')
  }

  const oppsByStage = (stage: OpportunityStage) =>
    opportunities.filter(o => o.stage === stage)

  const successPct = selectedOpp ? STAGE_SUCCESS[selectedOpp.stage] : 0

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
                  {total > 0 && (
                    <div className="px-3 pb-2 text-xs text-slate-500">{formatCurrency(total)}</div>
                  )}
                </div>

                <div className="space-y-3">
                  {opps.map(opp => (
                    <Card
                      key={opp.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedOpp(opp)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOpp(opp) } }}
                    >
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm text-slate-900 mb-1">{opp.title}</p>
                        <p className="text-xs text-slate-500 mb-2">{opp.prospect_name}</p>
                        {opp.estimated_amount && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                            <Euro className="w-3 h-3" />
                            {formatCurrency(opp.estimated_amount)}
                          </div>
                        )}
                        {opp.city && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {opp.city}
                          </div>
                        )}
                        {opp.next_action_date && (
                          <p className="text-xs text-amber-600 mt-2">
                            Action: {formatDate(opp.next_action_date)}
                          </p>
                        )}
                        {opp.converted_to_client && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Converti en client
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

      {/* Slide-in detail panel (right side) */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${selectedOpp ? 'translate-x-0' : 'translate-x-full'}`}
      >
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

              {/* Value + stage */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Valeur</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedOpp.estimated_amount ? formatCurrency(selectedOpp.estimated_amount) : '—'}
                  </p>
                </div>
                <StatusBadge status={selectedOpp.stage} />
              </div>

              {/* Success probability bar */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] text-slate-400">Probabilité de succès</span>
                  <span className="text-[11px] font-semibold text-slate-600">{successPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      successPct === 100 ? 'bg-green-500' :
                      successPct === 0 ? 'bg-red-400' :
                      successPct >= 60 ? 'bg-blue-500' : 'bg-blue-400'
                    }`}
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
                    { value: 'devis', label: 'Devis', icon: FileText },
                    { value: 'taches', label: 'Tâches', icon: ClipboardList },
                    { value: 'facture', label: 'Facture', icon: Receipt },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-3 pb-2 pt-1 text-xs font-medium text-slate-500 gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Prospect tab */}
                <TabsContent value="prospect" className="m-0 p-5 space-y-4">
                  {/* Primary contact */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact principal</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900">
                          {selectedOpp.contact_name || selectedOpp.prospect_name}
                        </p>
                        {selectedOpp.client_type && (
                          <p className="text-xs text-slate-400 capitalize">{selectedOpp.client_type}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {selectedOpp.email && (
                          <a
                            href={`mailto:${selectedOpp.email}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {selectedOpp.phone && (
                          <a
                            href={`tel:${selectedOpp.phone}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
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

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => { setSelectedOpp(null); handleOpenEdit(selectedOpp) }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setConfirmDelete(selectedOpp.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Activité tab */}
                <TabsContent value="activite" className="m-0 p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Historique récent</p>

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
                        <p className="text-xs font-semibold text-slate-800">Étape actuelle : {OPPORTUNITY_STAGE_LABELS[selectedOpp.stage]}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Dernière mise à jour le {formatDate(selectedOpp.updated_at)}</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white" />
                        <p className="text-xs font-semibold text-slate-800">Opportunité créée</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedOpp.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stage progression */}
                  <div className="mt-6">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Changer l&apos;étape</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.filter(s => s !== selectedOpp.stage && s !== 'perdue' && s !== 'gagnee').map(s => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            handleMoveStage(selectedOpp, s)
                            setSelectedOpp(prev => prev ? { ...prev, stage: s } : null)
                          }}
                        >
                          {OPPORTUNITY_STAGE_LABELS[s]}
                        </Button>
                      ))}
                      {!selectedOpp.converted_to_client && (
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700 text-xs h-7"
                          onClick={() => {
                            winOpportunity(selectedOpp.id)
                            toast.success(`Opportunité gagnée ! Client "${selectedOpp.prospect_name}" créé automatiquement.`, { duration: 5000 })
                            setSelectedOpp(null)
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marquer Gagnée
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Devis tab */}
                <TabsContent value="devis" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Devis</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Nouveau devis
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Aucun devis</p>
                    <p className="text-xs text-slate-400 mt-1">Créez votre premier devis pour cette opportunité</p>
                  </div>
                </TabsContent>

                {/* Tâches tab */}
                <TabsContent value="taches" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tâches</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Nouvelle tâche
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                      <ClipboardList className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Aucune tâche</p>
                    <p className="text-xs text-slate-400 mt-1">Ajoutez des tâches pour suivre les actions à faire</p>
                  </div>
                </TabsContent>

                {/* Facture tab */}
                <TabsContent value="facture" className="m-0 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Factures</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Nouvelle facture
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                      <Receipt className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Aucune facture</p>
                    <p className="text-xs text-slate-400 mt-1">Les factures liées à cette opportunité apparaîtront ici</p>
                  </div>
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
                    {STAGES.map(s => (
                      <SelectItem key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</SelectItem>
                    ))}
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
