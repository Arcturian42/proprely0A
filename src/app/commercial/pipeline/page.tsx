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

  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)
  const wonCount = opportunities.filter(o => o.stage === 'gagnee').length
  const conversionRate = opportunities.length > 0 ? Math.round((wonCount / opportunities.length) * 100) : 0

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A]">Pipeline commercial</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-full px-3 py-1 text-[12px] font-semibold text-[#475569] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                {opportunities.length} opportunités
              </span>
              <span className="inline-flex items-center gap-1 bg-[#EEF2FF] rounded-full px-3 py-1 text-[12px] font-semibold text-[#6366F1]">
                {formatCurrency(totalValue)}
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 rounded-full px-3 py-1 text-[12px] font-semibold text-emerald-700">
                {conversionRate}% conversion
              </span>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouvelle opportunité
          </button>
        </div>

        {/* Kanban board */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {STAGES.map(stage => {
            const opps = oppsByStage(stage)
            const total = opps.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)
            return (
              <div key={stage} className="flex flex-col w-[280px] min-w-[280px] flex-shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STAGE_DOT_COLORS[stage]}`} />
                    <span className="text-[13px] font-bold text-[#0F172A]">{OPPORTUNITY_STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <span className="text-[11px] text-[#94A3B8] font-medium">{formatCurrency(total)}</span>
                    )}
                    <div className="w-5 h-5 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] font-bold flex items-center justify-center">
                      {opps.length}
                    </div>
                  </div>
                </div>

                {/* Column body */}
                <div className="bg-[#F1F5F9] rounded-[12px] p-2 space-y-2 min-h-[200px]">
                  {opps.map(opp => {
                    const prob = opp.stage === 'gagnee' ? 100 : opp.stage === 'perdue' ? 0 :
                      opp.stage === 'negociation' ? 75 : opp.stage === 'proposition' ? 55 :
                      opp.stage === 'decouverte' ? 35 : opp.stage === 'prise_de_contact' ? 20 : 10
                    const probColor = prob > 70 ? 'bg-emerald-50 text-emerald-700' : prob > 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    return (
                      <div
                        key={opp.id}
                        className="bg-white rounded-[10px] border border-[#E2E8F0] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer"
                        onClick={() => setSelectedOpp(opp)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOpp(opp) } }}
                      >
                        <p className="text-[13px] font-semibold text-[#0F172A]">{opp.title}</p>
                        {opp.estimated_amount && (
                          <p className="text-[18px] font-bold text-[#6366F1] mt-1">{formatCurrency(opp.estimated_amount)}</p>
                        )}
                        {opp.contact_name && (
                          <p className="text-[11px] text-[#94A3B8] mt-1">{opp.contact_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${probColor}`}>
                            {prob}%
                          </span>
                          {opp.next_action_date && (
                            <span className="text-[11px] text-[#94A3B8]">{formatDate(opp.next_action_date)}</span>
                          )}
                        </div>
                        {opp.converted_to_client && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Converti en client
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {opps.length === 0 && (
                    <div className="border-2 border-dashed border-[#E2E8F0] rounded-[10px] p-6 text-center">
                      <p className="text-[12px] text-[#94A3B8]">Aucune opportunité</p>
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
              <div className="flex items-start gap-3">
                <div>
                  <DialogTitle className="text-[16px] font-bold text-[#0F172A]">{selectedOpp.prospect_name}</DialogTitle>
                  <div className="mt-1">
                    <StatusBadge status={selectedOpp.stage} />
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedOpp.contact_name && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Contact</p>
                    <p className="text-[13px] font-medium text-[#0F172A] mt-0.5">{selectedOpp.contact_name}</p>
                  </div>
                )}
                {selectedOpp.estimated_amount && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Montant</p>
                    <p className="text-[13px] font-medium text-[#6366F1] mt-0.5">{formatCurrency(selectedOpp.estimated_amount)}</p>
                  </div>
                )}
                {selectedOpp.phone && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Téléphone</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-[#94A3B8]" />
                      <p className="text-[13px] font-medium text-[#0F172A]">{selectedOpp.phone}</p>
                    </div>
                  </div>
                )}
                {selectedOpp.email && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Email</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-[#94A3B8]" />
                      <p className="text-[13px] font-medium text-[#0F172A] truncate">{selectedOpp.email}</p>
                    </div>
                  </div>
                )}
                {selectedOpp.city && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Ville</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#94A3B8]" />
                      <p className="text-[13px] font-medium text-[#0F172A]">{selectedOpp.city}</p>
                    </div>
                  </div>
                )}
                {selectedOpp.next_action_date && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Prochaine action</p>
                    <p className="text-[13px] font-medium text-amber-600 mt-0.5">{formatDate(selectedOpp.next_action_date)}</p>
                  </div>
                )}
              </div>

              {selectedOpp.notes && (
                <div className="border-t border-[#F1F5F9] pt-4">
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Notes</p>
                  <p className="text-[13px] text-[#475569] bg-[#F8FAFC] rounded-[8px] p-3">{selectedOpp.notes}</p>
                </div>
              )}

              <div className="border-t border-[#F1F5F9] pt-4">
                <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Changer l'étape</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter(s => s !== selectedOpp.stage && s !== 'perdue' && s !== 'gagnee').map(s => (
                    <button
                      key={s}
                      className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-8 px-3 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                      onClick={() => {
                        handleMoveStage(selectedOpp, s)
                        setSelectedOpp(prev => prev ? { ...prev, stage: s } : null)
                      }}
                    >
                      {OPPORTUNITY_STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {!selectedOpp.converted_to_client && (
                <button
                  className="inline-flex items-center gap-1.5 bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors"
                  onClick={() => {
                    winOpportunity(selectedOpp.id)
                    toast.success(`Opportunité gagnée ! Client "${selectedOpp.prospect_name}" créé automatiquement.`, { duration: 5000 })
                    setSelectedOpp(null)
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marquer Gagnée
                </button>
              )}
              <button
                className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-9 px-4 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                onClick={() => { setSelectedOpp(null); handleOpenEdit(selectedOpp) }}
              >
                Modifier
              </button>
              <button
                className="inline-flex items-center border border-red-200 rounded-[8px] h-9 px-4 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => setConfirmDelete(selectedOpp.id)}
              >
                Supprimer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-[#0F172A]">
              {editingOpp ? "Modifier l'opportunité" : 'Nouvelle opportunité'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-[12px] font-semibold text-[#475569]">Titre *</Label>
                <Input
                  className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Nettoyage bureaux - Société X"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[12px] font-semibold text-[#475569]">Nom du prospect *</Label>
                <Input
                  className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1"
                  value={form.prospect_name}
                  onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))}
                  placeholder="Nom de l'entreprise"
                />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Contact</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nom complet" />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Téléphone</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Email</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Ville</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Montant estimé (€)</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="number" value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Étape</Label>
                <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v as OpportunityStage }))}>
                  <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Prochaine action</Label>
                <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#475569]">Type client</Label>
                <Select value={form.client_type} onValueChange={(v) => setForm(f => ({ ...f, client_type: v }))}>
                  <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                    <SelectItem value="professionnel">Professionnel libéral</SelectItem>
                    <SelectItem value="syndic">Syndic</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[12px] font-semibold text-[#475569]">Notes</Label>
                <Textarea className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-9 px-4 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="inline-flex items-center bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors" onClick={handleSave}>{editingOpp ? 'Mettre à jour' : 'Créer'}</button>
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
