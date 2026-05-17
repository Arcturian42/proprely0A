'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore, computeDevisTotal } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Devis, DevisLine, DevisStatus } from '@/types'
import { DEVIS_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, FileText, ArrowRight, ChevronDown, Search } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<DevisStatus, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  envoye: 'bg-blue-100 text-blue-700',
  accepte: 'bg-green-100 text-green-700',
  refuse: 'bg-red-100 text-red-700',
  expire: 'bg-amber-100 text-amber-700',
}

const emptyLine = (): DevisLine => ({
  id: `line-${Date.now()}-${Math.random()}`,
  description: '',
  quantity: 1,
  unit_price: 0,
  tva_rate: 20,
})

const defaultForm = {
  title: '',
  opportunity_id: '',
  client_id: '',
  site_id: '',
  tva_rate: 20,
  valid_until: '',
  notes: '',
  status: 'brouillon' as DevisStatus,
  lines: [emptyLine()],
}

export default function DevisPage() {
  useEffect(() => { document.title = 'Devis — Proprely' }, [])
  const { devis, addDevis, updateDevis, deleteDevis, convertDevisToFacture, clients, opportunities } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Devis | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const openCreate = () => {
    setEditing(null)
    setForm({ ...defaultForm, lines: [emptyLine()] })
    setShowForm(true)
  }

  const openEdit = (d: Devis) => {
    setEditing(d)
    setForm({
      title: d.title,
      opportunity_id: d.opportunity_id || '',
      client_id: d.client_id || '',
      site_id: d.site_id || '',
      tva_rate: d.tva_rate,
      valid_until: d.valid_until || '',
      notes: d.notes || '',
      status: d.status,
      lines: d.lines.length ? d.lines : [emptyLine()],
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title) { toast.error('Titre requis'); return }
    if (form.lines.some(l => !l.description)) { toast.error('Toutes les lignes doivent avoir une description'); return }

    const now = new Date().toISOString()
    if (editing) {
      updateDevis(editing.id, {
        ...form,
        opportunity_id: form.opportunity_id || null,
        client_id: form.client_id || null,
        site_id: form.site_id || null,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        updated_at: now,
      })
      toast.success('Devis mis à jour')
    } else {
      const year = new Date().getFullYear()
      const num = String(devis.length + 1).padStart(3, '0')
      const newDevis: Devis = {
        id: `devis-${Date.now()}`,
        company_id: 'company-1',
        number: `DEV-${year}-${num}`,
        ...form,
        opportunity_id: form.opportunity_id || null,
        client_id: form.client_id || null,
        site_id: form.site_id || null,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        created_at: now,
        updated_at: now,
      }
      addDevis(newDevis)
      toast.success('Devis créé')
    }
    setShowForm(false)
  }

  const handleConvert = (d: Devis) => {
    convertDevisToFacture(d.id)
    toast.success('Devis converti en facture')
  }

  const updateLine = (idx: number, field: keyof DevisLine, value: string | number) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }))
  }

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const { subtotal, tva, total } = computeDevisTotal(form.lines, form.tva_rate)

  const filtered = devis.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalEnAttente = devis
    .filter(d => d.status === 'envoye')
    .reduce((sum, d) => {
      const { total } = computeDevisTotal(d.lines, d.tva_rate)
      return sum + total
    }, 0)

  const totalAccepte = devis
    .filter(d => d.status === 'accepte')
    .reduce((sum, d) => {
      const { total } = computeDevisTotal(d.lines, d.tva_rate)
      return sum + total
    }, 0)

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Devis"
          description="Gérez vos propositions commerciales"
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouveau devis
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total devis</p>
              <p className="text-2xl font-bold text-slate-900">{devis.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">En attente de réponse</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalEnAttente)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Devis acceptés</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAccepte)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(DEVIS_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Aucun devis</p>
            <p className="text-sm text-slate-400 mt-1">Créez votre premier devis pour commencer</p>
            <Button onClick={openCreate} className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" /> Nouveau devis
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Validité</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(d => {
                  const client = clients.find(c => c.id === d.client_id)
                  const opp = opportunities.find(o => o.id === d.opportunity_id)
                  const { total } = computeDevisTotal(d.lines, d.tva_rate)
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.number}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {client?.name || opp?.prospect_name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                          {DEVIS_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {d.valid_until ? formatDate(d.valid_until) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {d.status === 'brouillon' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => { updateDevis(d.id, { status: 'envoye', updated_at: new Date().toISOString() }); toast.success('Devis marqué envoyé') }}
                            >
                              Envoyer
                            </Button>
                          )}
                          {d.status === 'envoye' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => { updateDevis(d.id, { status: 'accepte', updated_at: new Date().toISOString() }); toast.success('Devis accepté') }}
                              >
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => { updateDevis(d.id, { status: 'refuse', updated_at: new Date().toISOString() }); toast.success('Devis refusé') }}
                              >
                                Refuser
                              </Button>
                            </>
                          )}
                          {d.status === 'accepte' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleConvert(d)}
                            >
                              <ArrowRight className="w-3 h-3" /> Facturer
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(d)}>
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDelete(d.id)}
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
            <DialogTitle>{editing ? 'Modifier le devis' : 'Nouveau devis'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux mensuel" />
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
                <Label>Opportunité liée</Label>
                <Select value={form.opportunity_id} onValueChange={v => setForm(f => ({ ...f, opportunity_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Lier à une opportunité..." /></SelectTrigger>
                  <SelectContent>
                    {opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valable jusqu&apos;au</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as DevisStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEVIS_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lignes de devis</Label>
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
                          <Input
                            value={line.description}
                            onChange={e => updateLine(idx, 'description', e.target.value)}
                            placeholder="Description..."
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 1)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
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

              {/* Totals */}
              <div className="mt-3 flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total HT</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA</span>
                    <span>{formatCurrency(tva)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                    <span>Total TTC</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes / Conditions</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Conditions particulières, délais de paiement..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Mettre à jour' : 'Créer le devis'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer le devis"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => { if (confirmDelete) { deleteDevis(confirmDelete); setConfirmDelete(null); toast.success('Devis supprimé') } }}
      />
    </AdminLayout>
  )
}
