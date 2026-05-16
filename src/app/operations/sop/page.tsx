'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Sop } from '@/types'
import { Plus, Trash2, Edit, BookOpen, Clock, CheckSquare, X } from 'lucide-react'
import { toast } from 'sonner'

export default function SopPage() {
  useEffect(() => { document.title = 'SOPs — Proprely' }, [])
  const { sops, addSop, updateSop, deleteSop, sites } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editingSop, setEditingSop] = useState<Sop | null>(null)
  const [selectedSop, setSelectedSop] = useState<Sop | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', service_type: '', estimated_duration_minutes: '', safety_instructions: '', notes: '', frequency: '',
  })
  const [associatedSiteIds, setAssociatedSiteIds] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string }[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [requiredMaterials, setRequiredMaterials] = useState<string[]>([])
  const [requiredProducts, setRequiredProducts] = useState<string[]>([])
  const [newMaterial, setNewMaterial] = useState('')
  const [newProduct, setNewProduct] = useState('')

  const handleOpenCreate = () => {
    setEditingSop(null)
    setForm({ title: '', service_type: '', estimated_duration_minutes: '', safety_instructions: '', notes: '', frequency: '' })
    setChecklistItems([])
    setRequiredMaterials([])
    setRequiredProducts([])
    setAssociatedSiteIds([])
    setShowForm(true)
  }

  const handleOpenEdit = (sop: Sop) => {
    setEditingSop(sop)
    setForm({
      title: sop.title, service_type: sop.service_type || '',
      estimated_duration_minutes: sop.estimated_duration_minutes?.toString() || '',
      safety_instructions: sop.safety_instructions || '', notes: sop.notes || '',
      frequency: sop.frequency || '',
    })
    setChecklistItems(sop.checklist_items.map(item => ({ id: item.id, text: item.text })))
    setRequiredMaterials([...sop.required_materials])
    setRequiredProducts([...sop.required_products])
    setAssociatedSiteIds(sop.associated_site_ids || [])
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title) { toast.error('Titre requis'); return }
    const sopData = {
      ...form,
      estimated_duration_minutes: form.estimated_duration_minutes ? parseInt(form.estimated_duration_minutes) : null,
      required_skills: [],
      required_materials: requiredMaterials,
      required_products: requiredProducts,
      checklist_items: checklistItems,
      associated_site_ids: associatedSiteIds,
    }
    if (editingSop) {
      updateSop(editingSop.id, { ...sopData, updated_at: new Date().toISOString() })
      toast.success('Protocole mis à jour')
    } else {
      const newSop: Sop = {
        id: `sop-${Date.now()}`, company_id: 'company-1', ...sopData,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addSop(newSop)
      toast.success('Protocole créé')
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    deleteSop(id)
    toast.success('Protocole supprimé')
    setConfirmDelete(null)
  }

  const associatedSitesSection = selectedSop
    ? (() => {
        const siteIds = selectedSop.associated_site_ids
        if (!siteIds || siteIds.length === 0) return null
        const linked = sites.filter(s => siteIds.includes(s.id))
        if (linked.length === 0) return null
        return (
          <div>
            <p className="font-semibold text-slate-700 mb-1">Sites associés</p>
            <div className="flex flex-wrap gap-1">{linked.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}</div>
          </div>
        )
      })()
    : null

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Protocoles SOP"
          description="Bibliothèque de procédures opérationnelles standards"
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nouveau protocole
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sops.map(sop => (
            <Card key={sop.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSop(sop)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-sm">{sop.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sop.service_type && (
                  <Badge variant="secondary" className="text-xs">{sop.service_type}</Badge>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {sop.estimated_duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sop.estimated_duration_minutes} min
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    {sop.checklist_items.length} étapes
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); handleOpenEdit(sop) }}>
                    <Edit className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setConfirmDelete(sop.id) }}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {sops.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500">
              <BookOpen className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-lg font-medium">Aucun protocole</p>
              <p className="text-sm">Créez votre premier protocole SOP</p>
            </div>
          )}
        </div>
      </div>

      {/* SOP detail dialog */}
      {selectedSop && (
        <Dialog open={!!selectedSop} onOpenChange={() => setSelectedSop(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedSop.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {selectedSop.service_type && <Badge variant="secondary">{selectedSop.service_type}</Badge>}
                {selectedSop.estimated_duration_minutes && (
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />{selectedSop.estimated_duration_minutes} min
                  </Badge>
                )}
                {selectedSop.frequency && (
                  <Badge variant="outline">{selectedSop.frequency}</Badge>
                )}
              </div>
              {associatedSitesSection}

              {selectedSop.checklist_items.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">Checklist</p>
                  <ul className="space-y-2">
                    {selectedSop.checklist_items.map((item, idx) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border-2 border-slate-200 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSop.required_materials.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Matériels</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSop.required_materials.map(m => <Badge key={m} variant="outline">{m}</Badge>)}
                  </div>
                </div>
              )}

              {selectedSop.required_products.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Produits</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSop.required_products.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                  </div>
                </div>
              )}

              {selectedSop.safety_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold text-amber-800 mb-1">⚠️ Sécurité</p>
                  <p className="text-amber-700">{selectedSop.safety_instructions}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSop(null)}>Fermer</Button>
              <Button onClick={() => { setSelectedSop(null); handleOpenEdit(selectedSop) }}>Modifier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSop ? 'Modifier le protocole' : 'Nouveau protocole'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de service</Label>
                <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nettoyage_bureaux">Nettoyage bureaux</SelectItem>
                    <SelectItem value="nettoyage_medical">Nettoyage médical</SelectItem>
                    <SelectItem value="nettoyage_industriel">Nettoyage industriel</SelectItem>
                    <SelectItem value="nettoyage_residence">Nettoyage résidence</SelectItem>
                    <SelectItem value="vitrerie">Vitrerie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Durée estimée (min)</Label>
                <Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label>Fréquence</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue placeholder="Fréquence..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotidien">Quotidien</SelectItem>
                    <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="ponctuel">Ponctuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sites associés */}
            <div>
              <Label className="mb-2 block">Sites associés</Label>
              <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                {sites.map(site => (
                  <div key={site.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`site-${site.id}`}
                      checked={associatedSiteIds.includes(site.id)}
                      onCheckedChange={checked => setAssociatedSiteIds(prev =>
                        checked ? [...prev, site.id] : prev.filter(id => id !== site.id)
                      )}
                    />
                    <label htmlFor={`site-${site.id}`} className="text-sm cursor-pointer">{site.name}</label>
                  </div>
                ))}
                {sites.length === 0 && <p className="text-xs text-slate-400">Aucun site disponible</p>}
              </div>
            </div>

            {/* Checklist items */}
            <div>
              <Label className="mb-2 block">Checklist</Label>
              <div className="space-y-2 mb-2">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                    <Input
                      className="flex-1 h-8 text-sm"
                      value={item.text}
                      onChange={e => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}>
                      <X className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une étape..."
                  value={newChecklistItem}
                  className="flex-1 h-8 text-sm"
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, { id: `c-${Date.now()}`, text: newChecklistItem.trim() }])
                      setNewChecklistItem('')
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => {
                  if (newChecklistItem.trim()) {
                    setChecklistItems(prev => [...prev, { id: `c-${Date.now()}`, text: newChecklistItem.trim() }])
                    setNewChecklistItem('')
                  }
                }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Materials */}
            <div>
              <Label className="mb-2 block">Matériels requis</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {requiredMaterials.map(m => (
                  <Badge key={m} variant="outline" className="gap-1 cursor-pointer" onClick={() => setRequiredMaterials(prev => prev.filter(x => x !== m))}>
                    {m} <X className="w-2 h-2" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Ajouter matériel..." value={newMaterial} className="h-8 text-sm flex-1"
                  onChange={e => setNewMaterial(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newMaterial.trim()) { setRequiredMaterials(prev => [...prev, newMaterial.trim()]); setNewMaterial('') } }} />
                <Button size="sm" variant="outline" onClick={() => { if (newMaterial.trim()) { setRequiredMaterials(prev => [...prev, newMaterial.trim()]); setNewMaterial('') } }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Products */}
            <div>
              <Label className="mb-2 block">Produits requis</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {requiredProducts.map(p => (
                  <Badge key={p} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setRequiredProducts(prev => prev.filter(x => x !== p))}>
                    {p} <X className="w-2 h-2" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Ajouter produit..." value={newProduct} className="h-8 text-sm flex-1"
                  onChange={e => setNewProduct(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newProduct.trim()) { setRequiredProducts(prev => [...prev, newProduct.trim()]); setNewProduct('') } }} />
                <Button size="sm" variant="outline" onClick={() => { if (newProduct.trim()) { setRequiredProducts(prev => [...prev, newProduct.trim()]); setNewProduct('') } }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Instructions de sécurité</Label>
              <Textarea value={form.safety_instructions} onChange={e => setForm(f => ({ ...f, safety_instructions: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingSop ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer le protocole"
        description="Cette action est irréversible. Le protocole SOP sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </AdminLayout>
  )
}
