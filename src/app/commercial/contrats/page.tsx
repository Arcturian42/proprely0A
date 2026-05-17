'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Contrat, ContratStatus, ContratType } from '@/types'
import { CONTRAT_STATUS_LABELS, CONTRAT_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, ScrollText, Trash2, Search, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<ContratStatus, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  envoye: 'bg-blue-100 text-blue-700',
  signe: 'bg-green-100 text-green-700',
  resilie: 'bg-red-100 text-red-600',
  expire: 'bg-amber-100 text-amber-700',
}

const STATUS_ICONS: Record<ContratStatus, React.ElementType> = {
  brouillon: Clock,
  envoye: Clock,
  signe: CheckCircle2,
  resilie: AlertTriangle,
  expire: AlertTriangle,
}

const defaultForm = {
  title: '',
  client_id: '',
  opportunity_id: '',
  type: 'prestation' as ContratType,
  status: 'brouillon' as ContratStatus,
  start_date: '',
  end_date: '',
  monthly_amount: '',
  total_amount: '',
  notes: '',
}

export default function ContratsPage() {
  useEffect(() => { document.title = 'Contrats — Proprely' }, [])
  const { contrats, addContrat, updateContrat, deleteContrat, clients, opportunities } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contrat | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const openCreate = () => {
    setEditing(null)
    const today = new Date().toISOString().split('T')[0]
    const year = new Date()
    year.setFullYear(year.getFullYear() + 1)
    setForm({ ...defaultForm, start_date: today, end_date: year.toISOString().split('T')[0] })
    setShowForm(true)
  }

  const openEdit = (c: Contrat) => {
    setEditing(c)
    setForm({
      title: c.title, client_id: c.client_id,
      opportunity_id: c.opportunity_id || '',
      type: c.type, status: c.status,
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      monthly_amount: c.monthly_amount?.toString() || '',
      total_amount: c.total_amount?.toString() || '',
      notes: c.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title || !form.client_id) { toast.error('Titre et client requis'); return }
    const now = new Date().toISOString()
    if (editing) {
      updateContrat(editing.id, {
        ...form,
        opportunity_id: form.opportunity_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        monthly_amount: form.monthly_amount ? parseFloat(form.monthly_amount) : null,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        notes: form.notes || null,
        updated_at: now,
      })
      toast.success('Contrat mis à jour')
    } else {
      const year = new Date().getFullYear()
      const num = String(contrats.length + 1).padStart(3, '0')
      const newContrat: Contrat = {
        id: `contrat-${Date.now()}`, company_id: 'company-1',
        number: `CTR-${year}-${num}`,
        ...form,
        opportunity_id: form.opportunity_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        monthly_amount: form.monthly_amount ? parseFloat(form.monthly_amount) : null,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        signed_at: null,
        notes: form.notes || null,
        created_at: now, updated_at: now,
      }
      addContrat(newContrat)
      toast.success('Contrat créé')
    }
    setShowForm(false)
  }

  const sign = (c: Contrat) => {
    updateContrat(c.id, { status: 'signe', signed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    toast.success('Contrat marqué comme signé')
  }

  const filtered = contrats.filter(c => {
    const client = clients.find(cl => cl.id === c.client_id)
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.number.toLowerCase().includes(search.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const today = new Date()
  const signes = contrats.filter(c => c.status === 'signe')
  const aExpirer = contrats.filter(c =>
    c.status === 'signe' && c.end_date &&
    new Date(c.end_date) > today &&
    new Date(c.end_date) < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  )
  const caRecurrent = signes.reduce((s, c) => s + (c.monthly_amount || 0), 0)

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Contrats"
          description="Gestion des contrats clients"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouveau contrat
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Contrats actifs</p>
            <p className="text-2xl font-bold text-green-600">{signes.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">CA récurrent / mois</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(caRecurrent)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Arrivent à échéance</p>
              <p className={`text-2xl font-bold ${aExpirer.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{aExpirer.length}</p>
            </div>
            {aExpirer.length > 0 && <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" />}
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Total contrats</p>
            <p className="text-2xl font-bold text-slate-900">{contrats.length}</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(CONTRAT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <ScrollText className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Aucun contrat</p>
            <p className="text-sm text-slate-400 mt-1">Créez votre premier contrat client</p>
            <Button onClick={openCreate} className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" /> Nouveau contrat
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant/mois</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => {
                  const client = clients.find(cl => cl.id === c.client_id)
                  const isExpiringSoon = c.status === 'signe' && c.end_date &&
                    new Date(c.end_date) > today &&
                    new Date(c.end_date) < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
                  const StatusIcon = STATUS_ICONS[c.status]
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isExpiringSoon ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.number}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                      <td className="px-4 py-3 text-slate-600">{client?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{CONTRAT_TYPE_LABELS[c.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.monthly_amount ? formatCurrency(c.monthly_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {c.start_date && <span>{formatDate(c.start_date)}</span>}
                        {c.start_date && c.end_date && <span className="text-slate-300 mx-1">→</span>}
                        {c.end_date && (
                          <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                            {formatDate(c.end_date)}
                            {isExpiringSoon && ' ⚠'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {CONTRAT_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {c.status === 'brouillon' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => { updateContrat(c.id, { status: 'envoye', updated_at: new Date().toISOString() }); toast.success('Contrat envoyé') }}>
                              Envoyer
                            </Button>
                          )}
                          {c.status === 'envoye' && (
                            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => sign(c)}>
                              <CheckCircle2 className="w-3 h-3" /> Signer
                            </Button>
                          )}
                          {c.status === 'signe' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => { updateContrat(c.id, { status: 'resilie', updated_at: new Date().toISOString() }); toast.success('Contrat résilié') }}>
                              Résilier
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>Modifier</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDelete(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le contrat' : 'Nouveau contrat'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux mensuels" />
            </div>
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de contrat</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ContratType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRAT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ContratStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRAT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <Label>Montant mensuel (€)</Label>
              <Input type="number" value={form.monthly_amount} onChange={e => setForm(f => ({ ...f, monthly_amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Montant total (€)</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer le contrat"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => { if (confirmDelete) { deleteContrat(confirmDelete); setConfirmDelete(null); toast.success('Contrat supprimé') } }}
      />
    </AdminLayout>
  )
}
