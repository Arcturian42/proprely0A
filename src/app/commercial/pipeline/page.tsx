'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
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
import { Plus, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const STAGES: OpportunityStage[] = ['lead', 'prise_de_contact', 'decouverte', 'proposition', 'negociation', 'gagnee', 'perdue']

const STAGE_DOT_COLORS: Record<OpportunityStage, string> = {
  lead: 'bg-slate-400',
  prise_de_contact: 'bg-blue-400',
  decouverte: 'bg-indigo-400',
  proposition: 'bg-violet-400',
  negociation: 'bg-amber-400',
  gagnee: 'bg-emerald-500',
  perdue: 'bg-red-400',
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

  const totalOpps = opportunities.length
  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)
  const wonOpps = opportunities.filter(o => o.stage === 'gagnee').length
  const conversionRate = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100) : 0

  return (
    <AdminLayout>
      <div className="min-h-screen p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pipeline commercial</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {totalOpps} opportunités
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {formatCurrency(totalValue)} total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {conversionRate}% conversion
              </span>
            </div>
          </div>
          <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 text-sm font-medium flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Nouvelle opportunité
          </Button>
        </div>

        {/* Kanban board */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {STAGES.map(stage => {
            const opps = oppsByStage(stage)
            const total = opps.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)
            return (
              <div key={stage} className="flex-shrink-0 w-72">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STAGE_DOT_COLORS[stage]}`} />
                    <span className="text-sm font-semibold text-gray-900">{OPPORTUNITY_STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <span className="text-xs text-gray-400">{formatCurrency(total)}</span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {opps.length}
                    </span>
                  </div>
                </div>

                {/* Column body */}
                <div className="bg-gray-50 rounded-xl p-2 space-y-2 min-h-[120px]">
                  {opps.map(opp => {
                    const prob = opp.estimated_amount && opp.estimated_amount > 0 ? 75 : 50
                    const probColor = prob > 70
                      ? 'bg-emerald-50 text-emerald-700'
                      : prob > 40
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'

                    return (
                      <div
                        key={opp.id}
                        className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                        onClick={() => setSelectedOpp(opp)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOpp(opp) } }}
                      >
                        <p className="text-sm font-semibold text-gray-900">{opp.title}</p>
                        {opp.estimated_amount ? (
                          <p className="text-lg font-bold text-indigo-600 mt-0.5">{formatCurrency(opp.estimated_amount)}</p>
                        ) : null}
                        {opp.contact_name && (
                          <p className="text-xs text-gray-500 mt-0.5">{opp.contact_name}</p>
                        )}
                        {!opp.contact_name && opp.prospect_name && (
                          <p className="text-xs text-gray-500 mt-0.5">{opp.prospect_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${probColor}`}>
                            {prob}%
                          </span>
                          {opp.next_action_date && (
                            <span className="text-xs text-gray-400">{formatDate(opp.next_action_date)}</span>
                          )}
                        </div>
                        {opp.converted_to_client && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Converti en client
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {opps.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-xs text-gray-400">Aucune opportunité</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedOpp && (
        <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-gray-900">{selectedOpp.title}</DialogTitle>
                <StatusBadge status={selectedOpp.stage} />
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedOpp.contact_name && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedOpp.contact_name}</p>
                  </div>
                )}
                {selectedOpp.estimated_amount && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Montant</p>
                    <p className="text-sm font-medium text-indigo-600 mt-0.5">{formatCurrency(selectedOpp.estimated_amount)}</p>
                  </div>
                )}
                {selectedOpp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-700">{selectedOpp.phone}</p>
                  </div>
                )}
                {selectedOpp.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-700 truncate">{selectedOpp.email}</p>
                  </div>
                )}
              </div>

              {selectedOpp.notes && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Notes</p>
                  <p className="text-sm text-gray-700">{selectedOpp.notes}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Changer l'étape</p>
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
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(selectedOpp.id)}>
                Supprimer
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedOpp(null); handleOpenEdit(selectedOpp) }}>
                Modifier
              </Button>
              {!selectedOpp.converted_to_client && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 text-sm font-medium flex items-center gap-2"
                  onClick={() => {
                    winOpportunity(selectedOpp.id)
                    toast.success(`Opportunité gagnée ! Client "${selectedOpp.prospect_name}" créé automatiquement.`, { duration: 5000 })
                    setSelectedOpp(null)
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marquer Gagnée
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOpp ? "Modifier l'opportunité" : 'Nouvelle opportunité'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-full">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux - Société X" />
              </div>
              <div className="col-span-full">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Nom du prospect *</Label>
                <Input value={form.prospect_name} onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))} placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Contact</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nom complet" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Téléphone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Ville</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Montant estimé (€)</Label>
                <Input type="number" value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Étape</Label>
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
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Prochaine action</Label>
                <Input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Type client</Label>
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
              <div className="col-span-full">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 text-sm font-medium" onClick={handleSave}>{editingOpp ? 'Mettre à jour' : 'Créer'}</Button>
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
