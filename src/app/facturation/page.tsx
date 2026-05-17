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
import { useAppStore, computeDevisTotal } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Facture, FactureLine, FactureStatus } from '@/types'
import { FACTURE_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Receipt, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<FactureStatus, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  envoyee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  retard: 'bg-red-100 text-red-700',
  annulee: 'bg-slate-100 text-slate-400',
}

const emptyLine = (): FactureLine => ({
  id: `line-${Date.now()}-${Math.random()}`,
  description: '',
  quantity: 1,
  unit_price: 0,
  tva_rate: 20,
})

const defaultForm = {
  title: '',
  client_id: '',
  opportunity_id: '',
  due_date: '',
  notes: '',
  status: 'brouillon' as FactureStatus,
  tva_rate: 20,
  lines: [emptyLine()],
}

export default function FacturationPage() {
  useEffect(() => { document.title = 'Factures — Proprely' }, [])
  const { factures, addFacture, updateFacture, deleteFacture, clients, opportunities } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Facture | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const openCreate = () => {
    setEditing(null)
    const due = new Date()
    due.setDate(due.getDate() + 30)
    setForm({ ...defaultForm, lines: [emptyLine()], due_date: due.toISOString().split('T')[0] })
    setShowForm(true)
  }

  const openEdit = (f: Facture) => {
    setEditing(f)
    setForm({
      title: f.title,
      client_id: f.client_id || '',
      opportunity_id: f.opportunity_id || '',
      due_date: f.due_date || '',
      notes: f.notes || '',
      status: f.status,
      tva_rate: f.tva_rate,
      lines: f.lines.length ? f.lines : [emptyLine()],
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title) { toast.error('Titre requis'); return }
    if (form.lines.some(l => !l.description)) { toast.error('Toutes les lignes doivent avoir une description'); return }

    const now = new Date().toISOString()
    if (editing) {
      updateFacture(editing.id, {
        ...form,
        client_id: form.client_id || null,
        opportunity_id: form.opportunity_id || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        updated_at: now,
      })
      toast.success('Facture mise à jour')
    } else {
      const year = new Date().getFullYear()
      const num = String(factures.length + 1).padStart(3, '0')
      const newFacture: Facture = {
        id: `facture-${Date.now()}`,
        company_id: 'company-1',
        number: `FAC-${year}-${num}`,
        devis_id: null,
        mission_id: null,
        site_id: null,
        ...form,
        client_id: form.client_id || null,
        opportunity_id: form.opportunity_id || null,
        due_date: form.due_date || null,
        paid_at: null,
        notes: form.notes || null,
        created_at: now,
        updated_at: now,
      }
      addFacture(newFacture)
      toast.success('Facture créée')
    }
    setShowForm(false)
  }

  const markPaid = (f: Facture) => {
    updateFacture(f.id, { status: 'payee', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    toast.success('Facture marquée comme payée')
  }

  const updateLine = (idx: number, field: keyof FactureLine, value: string | number) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }))
  }

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const { subtotal, tva, total: formTotal } = computeDevisTotal(form.lines, form.tva_rate)

  const filtered = factures.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || f.status === filterStatus
    return matchSearch && matchStatus
  })

  const today = new Date()
  const enRetard = factures.filter(f => f.status === 'envoyee' && f.due_date && new Date(f.due_date) < today)
  const totalAEncaisser = factures
    .filter(f => f.status === 'envoyee' || f.status === 'retard')
    .reduce((sum, f) => { const { total } = computeDevisTotal(f.lines, f.tva_rate); return sum + total }, 0)
  const totalPaye = factures
    .filter(f => f.status === 'payee')
    .reduce((sum, f) => { const { total } = computeDevisTotal(f.lines, f.tva_rate); return sum + total }, 0)

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Factures"
          description="Suivi de votre facturation et des paiements"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouvelle facture
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total factures</p>
              <p className="text-2xl font-bold text-slate-900">{factures.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">À encaisser</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAEncaisser)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">En retard</p>
                <p className="text-2xl font-bold text-red-600">{enRetard.length}</p>
              </div>
              {enRetard.length > 0 && <AlertTriangle className="w-5 h-5 text-red-400 mt-1" />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Encaissé (total)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaye)}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
            </CardContent>
          </Card>
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
              {Object.entries(FACTURE_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Aucune facture</p>
            <p className="text-sm text-slate-400 mt-1">Les factures créées depuis un devis ou manuellement apparaissent ici</p>
            <Button onClick={openCreate} className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" /> Nouvelle facture
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Échéance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(f => {
                  const client = clients.find(c => c.id === f.client_id)
                  const opp = opportunities.find(o => o.id === f.opportunity_id)
                  const { total } = computeDevisTotal(f.lines, f.tva_rate)
                  const isOverdue = f.status === 'envoyee' && f.due_date && new Date(f.due_date) < today
                  return (
                    <tr key={f.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.number}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{f.title}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {client?.name || opp?.prospect_name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                          {FACTURE_STATUS_LABELS[f.status]}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {f.due_date ? formatDate(f.due_date) : '—'}
                        {isOverdue && ' ⚠'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {(f.status === 'envoyee' || f.status === 'retard') && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => markPaid(f)}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Payée
                            </Button>
                          )}
                          {f.status === 'brouillon' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => { updateFacture(f.id, { status: 'envoyee', updated_at: new Date().toISOString() }); toast.success('Facture envoyée') }}
                            >
                              Envoyer
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(f)}>
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDelete(f.id)}
                          >
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la facture' : 'Nouvelle facture'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux — Janvier 2025" />
              </div>
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date d&apos;échéance</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as FactureStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACTURE_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lignes de facture</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Description</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-20">Qté</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-28">PU HT (€)</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-24">TVA %</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium w-24">Total HT</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.lines.map((line, idx) => (
                      <tr key={line.id}>
                        <td className="px-2 py-1.5">
                          <Input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description..." className="h-8 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 1)} className="h-8 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={String(line.tva_rate)} onValueChange={v => updateLine(idx, 'tva_rate', parseFloat(v))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5.5">5,5%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5 text-right text-xs font-medium text-slate-700">
                          {formatCurrency(line.quantity * line.unit_price)}
                        </td>
                        <td className="px-2 py-1.5">
                          {form.lines.length > 1 && (
                            <button onClick={() => removeLine(idx)} className="text-slate-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total HT</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA</span><span>{formatCurrency(tva)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                    <span>Total TTC</span><span>{formatCurrency(formTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Conditions de règlement, références..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Mettre à jour' : 'Créer la facture'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer la facture"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => { if (confirmDelete) { deleteFacture(confirmDelete); setConfirmDelete(null); toast.success('Facture supprimée') } }}
      />
    </AdminLayout>
  )
}
