'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Client, Site } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, MapPin, Building2, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientsSitesPage() {
  useEffect(() => { document.title = 'Clients & Sites — Proprely' }, [])
  const { clients, sites, addClient, updateClient, deleteClient, addSite, updateSite, deleteSite } = useAppStore()
  const [search, setSearch] = useState('')
  const [showClientForm, setShowClientForm] = useState(false)
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<string | null>(null)
  const [confirmDeleteSite, setConfirmDeleteSite] = useState<string | null>(null)

  const [clientForm, setClientForm] = useState({
    name: '', contact_name: '', email: '', phone: '', billing_address: '',
    city: '', client_type: '', status: 'actif', notes: '',
  })

  const [siteForm, setSiteForm] = useState({
    client_id: '', name: '', address: '', city: '', surface_area: '',
    access_code: '', access_instructions: '', service_type: '', frequency: '', notes: '',
  })

  const handleOpenCreateClient = () => {
    setEditingClient(null)
    setClientForm({ name: '', contact_name: '', email: '', phone: '', billing_address: '', city: '', client_type: '', status: 'actif', notes: '' })
    setShowClientForm(true)
  }

  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client)
    setClientForm({
      name: client.name, contact_name: client.contact_name || '', email: client.email || '',
      phone: client.phone || '', billing_address: client.billing_address || '',
      city: client.city || '', client_type: client.client_type || '', status: client.status, notes: client.notes || '',
    })
    setShowClientForm(true)
  }

  const handleSaveClient = () => {
    if (!clientForm.name) { toast.error('Nom requis'); return }
    if (!clientForm.email && !clientForm.phone) {
      toast.error('Au moins un email ou un téléphone est requis')
      return
    }
    if (editingClient) {
      updateClient(editingClient.id, { ...clientForm, updated_at: new Date().toISOString() })
      toast.success('Client mis à jour')
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`, company_id: 'company-1', ...clientForm,
        created_from_opportunity_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addClient(newClient)
      toast.success('Client créé')
    }
    setShowClientForm(false)
  }

  const handleDeleteClient = (id: string) => {
    const siteCount = sites.filter(s => s.client_id === id).length
    deleteClient(id)
    toast.success(`Client supprimé${siteCount > 0 ? ` (${siteCount} site(s) associé(s) supprimé(s))` : ''}`)
    setConfirmDeleteClient(null)
  }

  const handleOpenCreateSite = () => {
    setEditingSite(null)
    setSiteForm({ client_id: '', name: '', address: '', city: '', surface_area: '', access_code: '', access_instructions: '', service_type: '', frequency: '', notes: '' })
    setShowSiteForm(true)
  }

  const handleOpenEditSite = (site: Site) => {
    setEditingSite(site)
    setSiteForm({
      client_id: site.client_id, name: site.name, address: site.address || '', city: site.city || '',
      surface_area: site.surface_area?.toString() || '', access_code: site.access_code || '',
      access_instructions: site.access_instructions || '', service_type: site.service_type || '',
      frequency: site.frequency || '', notes: site.notes || '',
    })
    setShowSiteForm(true)
  }

  const handleSaveSite = () => {
    if (!siteForm.name || !siteForm.client_id) { toast.error('Nom et client requis'); return }
    if (editingSite) {
      updateSite(editingSite.id, {
        ...siteForm, surface_area: siteForm.surface_area ? parseFloat(siteForm.surface_area) : null,
        updated_at: new Date().toISOString(),
      })
      toast.success('Site mis à jour')
    } else {
      const client = clients.find(c => c.id === siteForm.client_id)
      const newSite: Site = {
        id: `site-${Date.now()}`, company_id: 'company-1', ...siteForm,
        surface_area: siteForm.surface_area ? parseFloat(siteForm.surface_area) : null,
        sop_id: null, created_from_opportunity_id: null, client,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addSite(newSite)
      toast.success('Site créé')
    }
    setShowSiteForm(false)
  }

  const handleDeleteSite = (id: string) => {
    deleteSite(id)
    toast.success('Site supprimé')
    setConfirmDeleteSite(null)
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || (s.city || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A]">Clients & Sites</h1>
            <p className="text-[13px] text-[#475569] mt-0.5">Gestion de votre portefeuille clients et sites</p>
          </div>
          <button
            onClick={handleOpenCreateClient}
            className="inline-flex items-center gap-2 bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            className="pl-9 border border-[#E2E8F0] rounded-[8px] h-9 w-full text-[13px] bg-white text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] transition-all"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Tabs defaultValue="clients">
          <TabsList className="mb-5">
            <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
            <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => {
                const siteCount = sites.filter(s => s.client_id === client.id).length
                const initial = client.name.charAt(0).toUpperCase()
                const isActive = client.status === 'actif'
                return (
                  <div
                    key={client.id}
                    className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all"
                  >
                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-100 to-violet-100 text-[#6366F1] font-bold text-[16px] flex items-center justify-center flex-shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#0F172A] truncate">{client.name}</p>
                        {client.client_type && (
                          <span className="text-[11px] text-[#94A3B8] font-medium">{client.client_type}</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {client.status}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1.5 mb-4">
                      {client.contact_name && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                          <span className="text-[12px] text-[#475569] truncate">{client.contact_name}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                          <span className="text-[12px] text-[#475569]">{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                          <span className="text-[12px] text-[#475569] truncate">{client.email}</span>
                        </div>
                      )}
                      {client.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                          <span className="text-[12px] text-[#475569]">{client.city}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                      <span className="text-[11px] bg-[#F1F5F9] text-[#475569] px-2 py-1 rounded-full font-medium">
                        {siteCount} site{siteCount !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          onClick={() => handleOpenEditClient(client)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                          onClick={() => setConfirmDeleteClient(client.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredClients.length === 0 && (
                <div className="col-span-3 text-center py-12 text-[#94A3B8] text-[13px]">Aucun client trouvé</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sites">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleOpenCreateSite}
                className="inline-flex items-center gap-2 bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouveau site
              </button>
            </div>
            <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr_80px] bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {['Site', 'Client', 'Adresse', 'Surface', 'Service', 'Fréquence', 'Actions'].map(h => (
                  <div key={h} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide px-4 py-3">{h}</div>
                ))}
              </div>

              {filteredSites.map(site => {
                const client = clients.find(c => c.id === site.client_id)
                return (
                  <div key={site.id} className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr_80px] items-center border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                    <div className="px-4 py-3.5">
                      <p className="text-[13px] font-semibold text-[#0F172A]">{site.name}</p>
                      {site.access_code && <p className="text-[11px] text-[#94A3B8]">Code: {site.access_code}</p>}
                    </div>
                    <div className="px-4 py-3.5 text-[13px] text-[#475569]">{client?.name || '—'}</div>
                    <div className="px-4 py-3.5 text-[13px] text-[#475569]">{site.address || '—'}</div>
                    <div className="px-4 py-3.5 text-[13px] text-[#475569]">{site.surface_area ? `${site.surface_area} m²` : '—'}</div>
                    <div className="px-4 py-3.5 text-[13px] text-[#475569]">{site.service_type || '—'}</div>
                    <div className="px-4 py-3.5 text-[13px] text-[#475569]">{site.frequency || '—'}</div>
                    <div className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          onClick={() => handleOpenEditSite(site)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                          onClick={() => setConfirmDeleteSite(site.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredSites.length === 0 && (
                <div className="text-center py-12 text-[#94A3B8] text-[13px]">Aucun site trouvé</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Client form dialog */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-[#0F172A]">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Nom *</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Contact</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={clientForm.contact_name} onChange={e => setClientForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Téléphone</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Email</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Ville</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Type</Label>
              <Select value={clientForm.client_type} onValueChange={v => setClientForm(f => ({ ...f, client_type: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entreprise">Entreprise</SelectItem>
                  <SelectItem value="professionnel">Professionnel libéral</SelectItem>
                  <SelectItem value="syndic">Syndic</SelectItem>
                  <SelectItem value="particulier">Particulier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Statut</Label>
              <Select value={clientForm.status} onValueChange={v => setClientForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Adresse de facturation</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={clientForm.billing_address} onChange={e => setClientForm(f => ({ ...f, billing_address: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Notes</Label>
              <Textarea className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white mt-1" value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <button className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-9 px-4 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors" onClick={() => setShowClientForm(false)}>Annuler</button>
            <button className="inline-flex items-center bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors" onClick={handleSaveClient}>{editingClient ? 'Mettre à jour' : 'Créer'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site form dialog */}
      <Dialog open={showSiteForm} onOpenChange={setShowSiteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-[#0F172A]">
              {editingSite ? 'Modifier le site' : 'Nouveau site'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Client *</Label>
              <Select value={siteForm.client_id} onValueChange={v => setSiteForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Nom du site *</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={siteForm.name} onChange={e => setSiteForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Bureaux 3e étage" />
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Adresse</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={siteForm.address} onChange={e => setSiteForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Ville</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={siteForm.city} onChange={e => setSiteForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Surface (m²)</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" type="number" value={siteForm.surface_area} onChange={e => setSiteForm(f => ({ ...f, surface_area: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Code d'accès</Label>
              <Input className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white mt-1" value={siteForm.access_code} onChange={e => setSiteForm(f => ({ ...f, access_code: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Type de service</Label>
              <Select value={siteForm.service_type} onValueChange={v => setSiteForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nettoyage_bureaux">Nettoyage bureaux</SelectItem>
                  <SelectItem value="nettoyage_medical">Nettoyage médical</SelectItem>
                  <SelectItem value="nettoyage_industriel">Nettoyage industriel</SelectItem>
                  <SelectItem value="nettoyage_residence">Nettoyage résidence</SelectItem>
                  <SelectItem value="nettoyage_parking">Nettoyage parking</SelectItem>
                  <SelectItem value="vitrerie">Vitrerie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#475569]">Fréquence</Label>
              <Select value={siteForm.frequency} onValueChange={v => setSiteForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 text-[13px] mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotidien">Quotidien</SelectItem>
                  <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                  <SelectItem value="bimensuel">Bimensuel</SelectItem>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="ponctuel">Ponctuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Instructions d'accès</Label>
              <Textarea className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white mt-1" value={siteForm.access_instructions} onChange={e => setSiteForm(f => ({ ...f, access_instructions: e.target.value }))} rows={2} />
            </div>
            <div className="col-span-2">
              <Label className="text-[12px] font-semibold text-[#475569]">Notes</Label>
              <Textarea className="border border-[#E2E8F0] rounded-[8px] px-3 text-[13px] bg-white mt-1" value={siteForm.notes} onChange={e => setSiteForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <button className="inline-flex items-center border border-[#E2E8F0] rounded-[8px] h-9 px-4 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors" onClick={() => setShowSiteForm(false)}>Annuler</button>
            <button className="inline-flex items-center bg-[#6366F1] text-white hover:bg-[#4F46E5] rounded-[8px] h-9 px-4 text-[13px] font-semibold transition-colors" onClick={handleSaveSite}>{editingSite ? 'Mettre à jour' : 'Créer'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteClient}
        onOpenChange={() => setConfirmDeleteClient(null)}
        title="Supprimer le client"
        description="Tous les sites associés seront également supprimés. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDeleteClient && handleDeleteClient(confirmDeleteClient)}
      />
      <ConfirmDialog
        open={!!confirmDeleteSite}
        onOpenChange={() => setConfirmDeleteSite(null)}
        title="Supprimer le site"
        description="Cette action est irréversible. Le site sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDeleteSite && handleDeleteSite(confirmDeleteSite)}
      />
    </AdminLayout>
  )
}
