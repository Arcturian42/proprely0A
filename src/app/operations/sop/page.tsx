'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
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
import { Plus, Trash2, Edit, BookOpen, Clock, CheckSquare, Search, Plus as PlusIcon, X, FileText } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_COLORS: Record<string, string> = {
  nettoyage_bureaux: 'bg-blue-50 text-blue-700',
  nettoyage_medical: 'bg-red-50 text-red-700',
  nettoyage_industriel: 'bg-amber-50 text-amber-700',
  nettoyage_residence: 'bg-emerald-50 text-emerald-700',
  vitrerie: 'bg-violet-50 text-violet-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  nettoyage_bureaux: 'Bureaux',
  nettoyage_medical: 'Médical',
  nettoyage_industriel: 'Industriel',
  nettoyage_residence: 'Résidence',
  vitrerie: 'Vitrerie',
}

export default function SopPage() {
  useEffect(() => { document.title = 'SOPs — Proprely' }, [])
  const { sops, addSop, updateSop, deleteSop, sites } = useAppStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSop, setEditingSop] = useState<Sop | null>(null)
  const [selectedSop, setSelectedSop] = useState<Sop | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', service_type: '', estimated_duration_minutes: '', safety_instructions: '', notes: '', frequency: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [associatedSiteIds, setAssociatedSiteIds] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string }[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [requiredMaterials, setRequiredMaterials] = useState<string[]>([])
  const [requiredProducts, setRequiredProducts] = useState<string[]>([])
  const [newMaterial, setNewMaterial] = useState('')
  const [newProduct, setNewProduct] = useState('')

  const filtered = sops.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.service_type || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCategories = new Set(sops.map(s => s.service_type).filter(Boolean)).size
  const totalLinkedSites = new Set(sops.flatMap(s => (s as Sop & { associated_site_ids?: string[] }).associated_site_ids || [])).size

  const handleOpenCreate = () => {
    setEditingSop(null)
    setForm({ title: '', service_type: '', estimated_duration_minutes: '', safety_instructions: '', notes: '', frequency: '' })
    setErrors({})
    setChecklistItems([])
    setRequiredMaterials([])
    setRequiredProducts([])
    setAssociatedSiteIds([])
    setShowForm(true)
  }

  const handleOpenEdit = (sop: Sop) => {
    setEditingSop(sop)
    setErrors({})
    setForm({
      title: sop.title, service_type: sop.service_type || '',
      estimated_duration_minutes: sop.estimated_duration_minutes?.toString() || '',
      safety_instructions: sop.safety_instructions || '', notes: sop.notes || '',
      frequency: sop.frequency || '',
    })
    setChecklistItems(sop.checklist_items.map(item => ({ id: item.id, text: item.text })))
    setRequiredMaterials([...sop.required_materials])
    setRequiredProducts([...sop.required_products])
    setAssociatedSiteIds((sop as Sop & { associated_site_ids?: string[] }).associated_site_ids || [])
    setShowForm(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title) e.title = 'Champ requis'
    if (!form.service_type) e.service_type = 'Champ requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) { toast.error('Veuillez remplir les champs obligatoires'); return }
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
        const siteIds = (selectedSop as Sop & { associated_site_ids?: string[] }).associated_site_ids
        if (!siteIds || siteIds.length === 0) return null
        const linked = sites.filter(s => siteIds.includes(s.id))
        if (linked.length === 0) return null
        return (
          <div>
            <p className="text-[12px] font-semibold text-[#475569] mb-2">Sites associés</p>
            <div className="flex flex-wrap gap-1">
              {linked.map(s => (
                <span key={s.id} className="text-[11px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full font-medium">{s.name}</span>
              ))}
            </div>
          </div>
        )
      })()
    : null

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Protocoles SOP</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 w-56"
                placeholder="Rechercher un SOP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-sm font-medium flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Nouveau SOP
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Protocoles', value: sops.length },
            { label: 'Catégories', value: totalCategories },
            { label: 'Sites liés', value: totalLinkedSites },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* SOP list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(sop => (
            <div
              key={sop.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedSop(sop)}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-1 leading-tight">{sop.title}</p>
                <div className="ml-auto flex gap-0.5" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(sop)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(sop.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Category badge */}
              {sop.service_type && (
                <div className="mt-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[sop.service_type] || 'bg-gray-100 text-gray-500'}`}>
                    {CATEGORY_LABELS[sop.service_type] || sop.service_type}
                  </span>
                </div>
              )}

              {/* Steps */}
              {sop.checklist_items.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                  {sop.checklist_items.slice(0, 3).map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-1">{item.text}</span>
                    </div>
                  ))}
                  {sop.checklist_items.length > 3 && (
                    <p className="text-xs text-gray-400 pl-6">+{sop.checklist_items.length - 3} autres étapes</p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                {sop.estimated_duration_minutes && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {sop.estimated_duration_minutes} min
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {sop.checklist_items.length} étapes
                </div>
                {(() => {
                  const siteIds = (sop as Sop & { associated_site_ids?: string[] }).associated_site_ids
                  return siteIds && siteIds.length > 0 ? (
                    <span className="ml-auto">{siteIds.length} site{siteIds.length > 1 ? 's' : ''}</span>
                  ) : null
                })()}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-16">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Aucun protocole trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Créez votre premier protocole SOP</p>
            </div>
          )}
        </div>
      </div>

      {/* SOP detail dialog */}
      {selectedSop && (
        <Dialog open={!!selectedSop} onOpenChange={() => setSelectedSop(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[17px] font-bold text-[#0F172A]">{selectedSop.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedSop.service_type && (
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[selectedSop.service_type] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                    {CATEGORY_LABELS[selectedSop.service_type] || selectedSop.service_type}
                  </span>
                )}
                {selectedSop.estimated_duration_minutes && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center gap-1">
                    <Clock className="w-3 h-3" />{selectedSop.estimated_duration_minutes} min
                  </span>
                )}
                {selectedSop.frequency && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569]">{selectedSop.frequency}</span>
                )}
              </div>
              {associatedSitesSection}

              {selectedSop.checklist_items.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#475569] mb-2 uppercase tracking-wide">Checklist</p>
                  <div className="space-y-2">
                    {selectedSop.checklist_items.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2.5 text-[13px] text-[#475569]">
                        <span className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#6366F1] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSop.required_materials.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#475569] mb-2 uppercase tracking-wide">Matériels</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSop.required_materials.map(m => (
                      <span key={m} className="text-[11px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full font-medium">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedSop.required_products.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#475569] mb-2 uppercase tracking-wide">Produits</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSop.required_products.map(p => (
                      <span key={p} className="text-[11px] bg-[#EEF2FF] text-[#6366F1] px-2 py-0.5 rounded-full font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedSop.safety_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3">
                  <p className="text-[12px] font-semibold text-amber-800 mb-1">Consignes de sécurité</p>
                  <p className="text-[13px] text-amber-700">{selectedSop.safety_instructions}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSop(null)}>Fermer</Button>
              <button
                onClick={() => { setSelectedSop(null); handleOpenEdit(selectedSop) }}
                className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] transition-colors"
              >
                Modifier
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#0F172A]">
              {editingSop ? 'Modifier le protocole' : 'Nouveau protocole'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Titre *</label>
              <input
                className={`border rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2${errors.title ? ' border-red-400 focus:ring-red-400/20' : ' border-[#E2E8F0] focus:ring-[#6366F1]/20 focus:border-[#6366F1]'}`}
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(p => ({ ...p, title: '' })) }}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Type de service *</label>
                <div className={errors.service_type ? 'ring-1 ring-red-400 rounded-lg' : ''}>
                  <Select value={form.service_type} onValueChange={v => { setForm(f => ({ ...f, service_type: v })); setErrors(p => ({ ...p, service_type: '' })) }}>
                    <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nettoyage_bureaux">Nettoyage bureaux</SelectItem>
                      <SelectItem value="nettoyage_medical">Nettoyage médical</SelectItem>
                      <SelectItem value="nettoyage_industriel">Nettoyage industriel</SelectItem>
                      <SelectItem value="nettoyage_residence">Nettoyage résidence</SelectItem>
                      <SelectItem value="vitrerie">Vitrerie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.service_type && <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>}
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Durée estimée (min)</label>
                <input
                  type="number"
                  className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                  value={form.estimated_duration_minutes}
                  onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Fréquence</label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full">
                    <SelectValue placeholder="Fréquence..." />
                  </SelectTrigger>
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
              <label className="text-[12px] font-semibold text-[#475569] mb-2 block">Sites associés</label>
              <div className="border border-[#E2E8F0] rounded-[8px] p-3 max-h-36 overflow-y-auto space-y-2">
                {sites.map(site => (
                  <div key={site.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`site-${site.id}`}
                      checked={associatedSiteIds.includes(site.id)}
                      onCheckedChange={checked => setAssociatedSiteIds(prev =>
                        checked ? [...prev, site.id] : prev.filter(id => id !== site.id)
                      )}
                    />
                    <label htmlFor={`site-${site.id}`} className="text-[13px] text-[#475569] cursor-pointer">{site.name}</label>
                  </div>
                ))}
                {sites.length === 0 && <p className="text-[12px] text-[#94A3B8]">Aucun site disponible</p>}
              </div>
            </div>

            {/* Checklist items */}
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-2 block">Checklist</label>
              <div className="space-y-2 mb-2">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-[11px] text-[#94A3B8] w-5">{idx + 1}.</span>
                    <input
                      className="flex-1 border border-[#E2E8F0] rounded-[8px] h-8 px-3 text-[13px] bg-white outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                      value={item.text}
                      onChange={e => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
                    />
                    <button
                      className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                      onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-[#E2E8F0] rounded-[8px] h-8 px-3 text-[13px] bg-white outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] placeholder:text-[#94A3B8]"
                  placeholder="Ajouter une étape..."
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, { id: `c-${Date.now()}`, text: newChecklistItem.trim() }])
                      setNewChecklistItem('')
                    }
                  }}
                />
                <button
                  className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, { id: `c-${Date.now()}`, text: newChecklistItem.trim() }])
                      setNewChecklistItem('')
                    }
                  }}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Materials */}
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-2 block">Matériels requis</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {requiredMaterials.map(m => (
                  <span
                    key={m}
                    className="text-[11px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
                    onClick={() => setRequiredMaterials(prev => prev.filter(x => x !== m))}
                  >
                    {m} <X className="w-2 h-2" />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-[#E2E8F0] rounded-[8px] h-8 px-3 text-[13px] bg-white outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] placeholder:text-[#94A3B8]"
                  placeholder="Ajouter matériel..."
                  value={newMaterial}
                  onChange={e => setNewMaterial(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newMaterial.trim()) { setRequiredMaterials(prev => [...prev, newMaterial.trim()]); setNewMaterial('') } }}
                />
                <button
                  className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
                  onClick={() => { if (newMaterial.trim()) { setRequiredMaterials(prev => [...prev, newMaterial.trim()]); setNewMaterial('') } }}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Products */}
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-2 block">Produits requis</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {requiredProducts.map(p => (
                  <span
                    key={p}
                    className="text-[11px] bg-[#EEF2FF] text-[#6366F1] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
                    onClick={() => setRequiredProducts(prev => prev.filter(x => x !== p))}
                  >
                    {p} <X className="w-2 h-2" />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-[#E2E8F0] rounded-[8px] h-8 px-3 text-[13px] bg-white outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] placeholder:text-[#94A3B8]"
                  placeholder="Ajouter produit..."
                  value={newProduct}
                  onChange={e => setNewProduct(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newProduct.trim()) { setRequiredProducts(prev => [...prev, newProduct.trim()]); setNewProduct('') } }}
                />
                <button
                  className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
                  onClick={() => { if (newProduct.trim()) { setRequiredProducts(prev => [...prev, newProduct.trim()]); setNewProduct('') } }}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Instructions de sécurité</label>
              <Textarea
                value={form.safety_instructions}
                onChange={e => setForm(f => ({ ...f, safety_instructions: e.target.value }))}
                rows={2}
                className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white w-full resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <button
              onClick={handleSave}
              className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] transition-colors"
            >
              {editingSop ? 'Mettre à jour' : 'Créer'}
            </button>
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
