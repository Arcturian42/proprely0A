'use client'

import { useState } from 'react'
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
  const { leads, addLead, updateLead, deleteLead } = useAppStore()
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
    if (!form.company_name) { toast.error('Nom de l\'entreprise requis'); return }
    const score = form.ai_score ? parseInt(form.ai_score) : null
    if (score !== null && (score < 0 || score > 100)) { toast.error('Le score IA doit être entre 0 et 100'); return }
    if (editingLead) {
      updateLead(editingLead.id, { ...form, ai_score: score, updated_at: new Date().toISOString() })
      toast.success('Lead mis à jour')
    } else {
      const newLead: Lead = {
        id: `lead-${Date.now()}`, company_id: 'company-1',
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
    updateLead(lead.id, { status: 'converti' as LeadStatus })
    toast.success(`Lead "${lead.company_name}" converti. Créez l'opportunité dans le pipeline.`)
  }

  const handleUpdateStatus = (lead: Lead, status: LeadStatus) => {
    updateLead(lead.id, { status, updated_at: new Date().toISOString() })
    toast.success('Statut mis à jour')
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Prospection IA"
          description="Gestion de vos leads et prospects"
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouveau lead
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {(['nouveau', 'a_contacter', 'contacte', 'converti'] as LeadStatus[]).map(status => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{leads.filter(l => l.status === status).length}</p>
                <StatusBadge status={status} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Score IA</TableHead>
                <TableHead>Besoin probable</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{lead.company_name}</p>
                      {lead.email && <p className="text-xs text-slate-500">{lead.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{lead.sector || '—'}</TableCell>
                  <TableCell className="text-sm">{lead.city || '—'}</TableCell>
                  <TableCell>
                    {lead.ai_score ? (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span className={`font-semibold text-sm ${lead.ai_score >= 80 ? 'text-green-600' : lead.ai_score >= 60 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {lead.ai_score}
                        </span>
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{lead.probable_need || '—'}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Aucun lead trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
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
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
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
