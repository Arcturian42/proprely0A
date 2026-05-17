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
import { ClientDocument, DocumentStatus, DocumentType } from '@/types'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, FolderOpen, Trash2, Search, AlertTriangle, CheckCircle2, Clock, Upload } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<DocumentStatus, string> = {
  valide: 'bg-green-100 text-green-700',
  expire: 'bg-red-100 text-red-700',
  en_attente: 'bg-amber-100 text-amber-700',
  manquant: 'bg-slate-100 text-slate-600',
}

const STATUS_ICONS: Record<DocumentStatus, React.ElementType> = {
  valide: CheckCircle2,
  expire: AlertTriangle,
  en_attente: Clock,
  manquant: AlertTriangle,
}

const REQUIRED_DOC_TYPES: DocumentType[] = ['dmc', 'deap', 'prev', 'rib', 'contrat']

const defaultForm = {
  client_id: '',
  type: 'dmc' as DocumentType,
  name: '',
  status: 'en_attente' as DocumentStatus,
  expiry_date: '',
  notes: '',
}

export default function DocumentsPage() {
  useEffect(() => { document.title = 'Documents — Proprely' }, [])
  const { documents, addDocument, updateDocument, deleteDocument, clients } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClientDocument | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [showMissing, setShowMissing] = useState(false)

  const openCreate = (clientId?: string, type?: DocumentType) => {
    setEditing(null)
    const year = new Date()
    year.setFullYear(year.getFullYear() + 1)
    setForm({
      ...defaultForm,
      client_id: clientId || '',
      type: type || 'dmc',
      expiry_date: year.toISOString().split('T')[0],
    })
    setShowForm(true)
  }

  const openEdit = (d: ClientDocument) => {
    setEditing(d)
    setForm({
      client_id: d.client_id,
      type: d.type,
      name: d.name,
      status: d.status,
      expiry_date: d.expiry_date || '',
      notes: d.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.client_id || !form.name) { toast.error('Client et nom requis'); return }
    const now = new Date().toISOString()

    let computedStatus = form.status
    if (form.expiry_date && new Date(form.expiry_date) < new Date()) {
      computedStatus = 'expire'
    }

    if (editing) {
      updateDocument(editing.id, {
        ...form, status: computedStatus,
        expiry_date: form.expiry_date || null, notes: form.notes || null,
        updated_at: now,
      })
      toast.success('Document mis à jour')
    } else {
      const newDoc: ClientDocument = {
        id: `doc-${Date.now()}`, company_id: 'company-1',
        opportunity_id: null, file_url: null,
        ...form, status: computedStatus,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        created_at: now, updated_at: now,
      }
      addDocument(newDoc)
      toast.success('Document ajouté')
    }
    setShowForm(false)
  }

  const filtered = documents.filter(d => {
    const client = clients.find(c => c.id === d.client_id)
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      DOCUMENT_TYPE_LABELS[d.type].toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    const matchClient = filterClient === 'all' || d.client_id === filterClient
    return matchSearch && matchStatus && matchClient
  })

  const today = new Date()
  const expires = documents.filter(d => d.status === 'expire' || (d.expiry_date && new Date(d.expiry_date) < today))
  const enAttente = documents.filter(d => d.status === 'en_attente')

  // Missing documents per client
  const missingDocs = clients.flatMap(client => {
    const clientDocs = documents.filter(d => d.client_id === client.id)
    return REQUIRED_DOC_TYPES.filter(type =>
      !clientDocs.some(d => d.type === type && d.status === 'valide')
    ).map(type => ({ client, type }))
  })

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Documents clients"
          description="DMC, DEAP, PREV, RIB et pièces contractuelles"
          action={
            <Button onClick={() => openCreate()} className="gap-2">
              <Plus className="w-4 h-4" /> Ajouter un document
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Total documents</p>
            <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Expirés / à renouveler</p>
              <p className={`text-2xl font-bold ${expires.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{expires.length}</p>
            </div>
            {expires.length > 0 && <AlertTriangle className="w-5 h-5 text-red-400 mt-1" />}
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">En attente</p>
              <p className={`text-2xl font-bold ${enAttente.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{enAttente.length}</p>
            </div>
            {enAttente.length > 0 && <Clock className="w-5 h-5 text-amber-400 mt-1" />}
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Docs manquants</p>
              <p className={`text-2xl font-bold ${missingDocs.length > 0 ? 'text-slate-600' : 'text-green-600'}`}>{missingDocs.length}</p>
            </div>
            <button
              onClick={() => setShowMissing(!showMissing)}
              className="text-[10px] text-blue-500 hover:underline mt-1"
            >
              {showMissing ? 'Masquer' : 'Voir'}
            </button>
          </CardContent></Card>
        </div>

        {/* Missing docs alert */}
        {showMissing && missingDocs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Documents requis manquants
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {missingDocs.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => openCreate(m.client.id, m.type)}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200 hover:border-amber-400 transition-colors text-left group"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-800">{m.client.name}</p>
                    <p className="text-[10px] text-slate-500">{DOCUMENT_TYPE_LABELS[m.type]}</p>
                  </div>
                  <Plus className="w-3 h-3 text-amber-500 group-hover:text-amber-700 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Aucun document</p>
            <p className="text-sm text-slate-400 mt-1">Ajoutez les pièces contractuelles de vos clients</p>
            <Button onClick={() => openCreate()} className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" /> Ajouter un document
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiration</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(d => {
                  const client = clients.find(c => c.id === d.client_id)
                  const StatusIcon = STATUS_ICONS[d.status]
                  const isExpiring = d.expiry_date &&
                    new Date(d.expiry_date) > today &&
                    new Date(d.expiry_date) < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${d.status === 'expire' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {client?.name[0] || '?'}
                          </div>
                          <span className="font-medium text-slate-800">{client?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {d.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{d.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {DOCUMENT_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${d.status === 'expire' ? 'text-red-600 font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        {d.expiry_date ? `${formatDate(d.expiry_date)}${isExpiring ? ' ⚠' : ''}${d.status === 'expire' ? ' ⛔' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {d.status !== 'valide' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => { updateDocument(d.id, { status: 'valide', updated_at: new Date().toISOString() }); toast.success('Document validé') }}>
                              <CheckCircle2 className="w-3 h-3" /> Valider
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(d)}>Modifier</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDelete(d.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le document' : 'Ajouter un document'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Type de document</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as DocumentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as DocumentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Nom du document *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: DMC 2025 - Grand Hotel Paris" />
            </div>
            <div className="col-span-2">
              <Label>Date d&apos;expiration</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Référence, observations..." />
            </div>
            <div className="col-span-2">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-slate-300 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Cliquer pour attacher un fichier</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG (max 10 Mo)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer le document"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => { if (confirmDelete) { deleteDocument(confirmDelete); setConfirmDelete(null); toast.success('Document supprimé') } }}
      />
    </AdminLayout>
  )
}
