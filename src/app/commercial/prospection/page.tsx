'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, Search, ChevronRight, Sparkles, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'

const defaultForm = {
  company_name: '',
  sector: '',
  city: '',
  email: '',
  phone: '',
  website: '',
  source: '',
  ai_score: '',
  probable_need: '',
  status: 'nouveau' as LeadStatus,
  notes: '',
}

const STATUS_STYLES: Record<string, string> = {
  nouveau: 'bg-blue-50 text-blue-700',
  a_contacter: 'bg-amber-50 text-amber-700',
  contacte: 'bg-violet-50 text-violet-700',
  converti: 'bg-emerald-50 text-emerald-700',
}

export default function ProspectionPage() {
  useEffect(() => { document.title = 'Prospection — Proprely' }, [])
  const { leads, addLead, updateLead, deleteLead, addOpportunity } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = leads.filter(l => {
    const matchSearch = l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.city || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleOpenCreate = () => {
    setEditingLead(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead)
    setForm({
      company_name: lead.company_name,
      sector: lead.sector || '',
      city: lead.city || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      source: lead.source || '',
      ai_score: lead.ai_score?.toString() || '',
      probable_need: lead.probable_need || '',
      status: lead.status,
      notes: lead.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.company_name) { toast.error("Nom de l'entreprise requis"); return }
    const score = form.ai_score ? parseInt(form.ai_score) : null
    if (score !== null && (score < 0 || score > 100)) { toast.error('Le score IA doit être entre 0 et 100'); return }
    if (editingLead) {
      updateLead(editingLead.id, { ...form, ai_score: score, updated_at: new Date().toISOString() })
      toast.success('Lead mis à jour')
    } else {
      const newLead: Lead = {
        id: crypto.randomUUID(), company_id: 'company-1',
        ...form, ai_score: score,
        converted_opportunity_id: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addLead(newLead)
      toast.success('Lead ajouté')
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    deleteLead(id)
    toast.success('Lead supprimé')
    setConfirmDelete(null)
  }

  const handleConvert = (lead: Lead) => {
    if (lead.status === 'converti') { toast.error('Ce lead a déjà été converti'); return }
    const now = new Date().toISOString()
    const newOppId = crypto.randomUUID()
    addOpportunity({
      id: newOppId,
      company_id: 'company-1',
      lead_id: lead.id,
      client_id: null,
      site_id: null,
      title: `Opportunité — ${lead.company_name}`,
      prospect_name: lead.company_name,
      contact_name: null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      site_address: null,
      client_type: null,
      service_type: null,
      estimated_amount: null,
      stage: 'prise_de_contact',
      next_action_date: null,
      notes: lead.notes ?? null,
      status: 'active',
      converted_to_client: false,
      converted_at: null,
      created_at: now,
      updated_at: now,
    })
    updateLead(lead.id, { status: 'converti' as LeadStatus, converted_opportunity_id: newOppId })
    toast.success(`Lead "${lead.company_name}" converti en opportunité.`)
  }

  const handleUpdateStatus = (lead: Lead, status: LeadStatus) => {
    updateLead(lead.id, { status, updated_at: new Date().toISOString() })
    toast.success('Statut mis à jour')
  }

  const statuses: LeadStatus[] = ['nouveau', 'a_contacter', 'contacte', 'converti']
  const statsConfig = [
    { label: 'Total leads', value: leads.length, color: 'text-[#0F172A]' },
    { label: 'Nouveaux', value: leads.filter(l => l.status === 'nouveau').length, color: 'text-blue-600' },
    { label: 'Contactés', value: leads.filter(l => l.status === 'contacte').length, color: 'text-violet-600' },
    { label: 'Convertis', value: leads.filter(l => l.status === 'converti').length, color: 'text-emerald-600' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A]">Prospection IA</h1>
            <p className="text-[13px] text-[#475569] mt-0.5">Gestion de vos leads et prospects</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau lead
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsConfig.map(s => (
            <div key={s.label} className="bg-white rounded-[12px] border border-[#E2E8F0] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <p className={`text-[24px] font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[12px] text-[#94A3B8] font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              className="pl-9 border border-[#E2E8F0] rounded-[8px] h-9 w-64 text-[13px] bg-white text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] transition-all"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] w-44 bg-white">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads table */}
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr_1fr] bg-[#F8FAFC] border-b border-[#E2E8F0]">
            {['Entreprise', 'Secteur', 'Ville', 'Score IA', 'Besoin probable', 'Statut', 'Actions'].map(h => (
              <div key={h} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide px-4 py-3">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(lead => (
            <div key={lead.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr_1fr] items-center px-0 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
              {/* Company */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-[8px] bg-[#EEF2FF] text-[#6366F1] text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                  {lead.company_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">{lead.company_name}</p>
                  {lead.email && <p className="text-[12px] text-[#475569] truncate">{lead.email}</p>}
                </div>
              </div>
              <div className="px-4 py-3.5 text-[13px] text-[#475569]">{lead.sector || '—'}</div>
              <div className="px-4 py-3.5 text-[13px] text-[#475569]">{lead.city || '—'}</div>
              <div className="px-4 py-3.5">
                {lead.ai_score ? (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className={`text-[13px] font-semibold ${lead.ai_score >= 80 ? 'text-emerald-600' : lead.ai_score >= 60 ? 'text-amber-600' : 'text-[#94A3B8]'}`}>
                      {lead.ai_score}
                    </span>
                  </div>
                ) : <span className="text-[13px] text-[#94A3B8]">—</span>}
              </div>
              <div className="px-4 py-3.5 text-[12px] text-[#475569] truncate">{lead.probable_need || '—'}</div>
              <div className="px-4 py-3.5">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                  {LEAD_STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-1">
                  <Select value={lead.status} onValueChange={(v) => handleUpdateStatus(lead, v as LeadStatus)}>
                    <SelectTrigger className="h-7 text-[11px] w-28 border border-[#E2E8F0] rounded-[6px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                    onClick={() => handleOpenEdit(lead)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-colors"
                    onClick={() => handleConvert(lead)}
                    title="Convertir en opportunité"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                    onClick={() => setConfirmDelete(lead.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#94A3B8] text-[13px]">
              Aucun lead trouvé
            </div>
          )}
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-[#0F172A]">
              {editingLead ? 'Modifier le lead' : 'Nouveau lead'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Nom de l'entreprise *</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Secteur</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder="Ex: Restauration" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Ville</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Email</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Téléphone</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Site web</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Source..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="google_maps">Google Maps</SelectItem>
                  <SelectItem value="referral">Recommandation</SelectItem>
                  <SelectItem value="site_web">Site web</SelectItem>
                  <SelectItem value="appel_entrant">Appel entrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Score IA (0-100)</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="number" min="0" max="100" value={form.ai_score} onChange={e => setForm(f => ({ ...f, ai_score: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Besoin probable</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={form.probable_need} onChange={e => setForm(f => ({ ...f, probable_need: e.target.value }))} placeholder="Ex: Nettoyage bureaux 3x/semaine" />
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Notes</Label>
              <Textarea className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <button className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-9 px-4 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="inline-flex items-center bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors" onClick={handleSave}>{editingLead ? 'Mettre à jour' : 'Créer'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer le lead"
        description="Cette action est irréversible. Le lead sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </AdminLayout>
  )
}
