'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, Search, ChevronRight, Sparkles, Trash2, Edit, Phone, Globe } from 'lucide-react'
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

export default function ProspectionPage() {
  useEffect(() => { document.title = 'Prospection — Proprely' }, [])
  const { leads, addLead, updateLead, deleteLead, addOpportunity } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
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
    setErrors({})
    setShowForm(true)
  }

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead)
    setErrors({})
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

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.company_name) e.company_name = 'Champ requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) { toast.error('Veuillez remplir les champs obligatoires'); return }
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

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Prospection IA</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9 w-full sm:w-64" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau lead
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['nouveau', 'a_contacter', 'contacte', 'converti'] as LeadStatus[]).map(status => (
            <div key={status} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{leads.filter(l => l.status === status).length}</p>
              <div className="mt-0.5"><StatusBadge status={status} /></div>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Entreprise', 'Secteur', 'Ville', 'Score IA', 'Besoin probable', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {lead.company_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{lead.company_name}</p>
                          {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.sector || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.city || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.ai_score ? (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span className={`font-semibold text-sm ${lead.ai_score >= 80 ? 'text-green-600' : lead.ai_score >= 60 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {lead.ai_score}
                          </span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{lead.probable_need || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Select value={lead.status} onValueChange={(v) => handleUpdateStatus(lead, v as LeadStatus)}>
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(lead)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleConvert(lead)}>
                          <ChevronRight className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDelete(lead.id)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                      Aucun lead trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Modifier le lead' : 'Nouveau lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom de l'entreprise *</Label>
              <Input
                value={form.company_name}
                onChange={e => { setForm(f => ({ ...f, company_name: e.target.value })); setErrors(p => ({ ...p, company_name: '' })) }}
                className={errors.company_name ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
            </div>
            <div>
              <Label>Secteur</Label>
              <Input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder="Ex: Restauration" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue placeholder="Source..." /></SelectTrigger>
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
              <Label>Score IA (0-100)</Label>
              <Input type="number" min="0" max="100" value={form.ai_score} onChange={e => setForm(f => ({ ...f, ai_score: e.target.value }))} />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Besoin probable</Label>
              <Input value={form.probable_need} onChange={e => setForm(f => ({ ...f, probable_need: e.target.value }))} placeholder="Ex: Nettoyage bureaux 3x/semaine" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingLead ? 'Mettre à jour' : 'Créer'}</Button>
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
