'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
import { Plus, Phone, Mail, MapPin, Euro, ChevronRight, CheckCircle2 } from 'lucide-react'
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

export default function PipelinePage() {
  useEffect(() => { document.title = 'Pipeline — Proprely' }, [])
  const { opportunities, addOpportunity, updateOpportunity, deleteOpportunity, winOpportunity, companySettings } = useAppStore()
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
        id: crypto.randomUUID(), company_id: companySettings.id ?? '',
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

      {/* Detail/Edit Dialog */}
      {selectedOpp && (
        <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedOpp.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedOpp.stage} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedOpp.contact_name && (
                  <div>
                    <p className="text-xs text-slate-500">Contact</p>
                    <p className="font-medium">{selectedOpp.contact_name}</p>
                  </div>
                )}
                {selectedOpp.estimated_amount && (
                  <div>
                    <p className="text-xs text-slate-500">Montant</p>
                    <p className="font-medium text-green-600">{formatCurrency(selectedOpp.estimated_amount)}</p>
                  </div>
                )}
                {selectedOpp.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <p>{selectedOpp.phone}</p>
                  </div>
                )}
                {selectedOpp.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <p className="truncate">{selectedOpp.email}</p>
                  </div>
                )}
              </div>
              {selectedOpp.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p>{selectedOpp.notes}</p>
                </div>
              )}
              {/* Stage progression */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Changer l'étape</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter(s => s !== selectedOpp.stage && s !== 'perdue' && s !== 'gagnee').map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
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
                      className="gap-1 bg-green-600 hover:bg-green-700"
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
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setSelectedOpp(null); handleOpenEdit(selectedOpp) }}>
                Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(selectedOpp.id)}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
