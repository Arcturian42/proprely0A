'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Client, Site } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, MapPin, Building2, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Can } from '@/components/auth/Can'
import { EmptyState } from '@/components/shared/EmptyState'

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
      <div className="p-8">
        <PageHeader title="Clients & Sites" description="Gestion de votre portefeuille clients et sites" />

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="clients">
          <TabsList className="mb-6">
            <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
            <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <div className="flex justify-end mb-4">
              <Can permission="client:write">
                <Button onClick={handleOpenCreateClient} className="gap-2">
                  <Plus className="w-4 h-4" /> Nouveau client
                </Button>
              </Can>
            </div>
            {clients.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Aucun client pour l'instant"
                description="Crée ton premier client pour démarrer un site et planifier des missions. Tu peux aussi en gagner un depuis le pipeline commercial."
                actions={[
                  { label: 'Créer un client', href: '#' },
                  { label: 'Voir le pipeline', href: '/commercial/pipeline', variant: 'outline' },
                ]}
              />
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{client.name}</CardTitle>
                        {client.client_type && (
                          <Badge variant="secondary" className="mt-1 text-xs">{client.client_type}</Badge>
                        )}
                      </div>
                      <Badge variant={client.status === 'actif' ? 'success' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {client.contact_name && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-3 h-3" />
                        {client.contact_name}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {client.city}
                      </div>
                    )}
                    <div className="text-xs text-slate-400">
                      {sites.filter(s => s.client_id === client.id).length} site(s)
                    </div>
                    <Can permission="client:write">
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEditClient(client)}>
                          <Edit className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                        <Can permission="client:delete">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteClient(client.id)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </Can>
                      </div>
                    </Can>
                  </CardContent>
                </Card>
              ))}
              {filteredClients.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-500">Aucun client trouvé</div>
              )}
            </div>
            )}
          </TabsContent>

          <TabsContent value="sites">
            <div className="flex justify-end mb-4">
              <Can permission="site:write">
                <Button onClick={handleOpenCreateSite} className="gap-2">
                  <Plus className="w-4 h-4" /> Nouveau site
                </Button>
              </Can>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map(site => {
                    const client = clients.find(c => c.id === site.client_id)
                    return (
                      <TableRow key={site.id}>
                        <TableCell>
                          <p className="font-medium text-slate-900">{site.name}</p>
                          {site.access_code && <p className="text-xs text-slate-500">Code: {site.access_code}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{client?.name || '—'}</TableCell>
                        <TableCell className="text-sm text-slate-600">{site.address || '—'}</TableCell>
                        <TableCell className="text-sm">{site.surface_area ? `${site.surface_area} m²` : '—'}</TableCell>
                        <TableCell className="text-sm">{site.service_type || '—'}</TableCell>
                        <TableCell className="text-sm">{site.frequency || '—'}</TableCell>
                        <TableCell>
                          <Can permission="site:write" fallback={<span className="text-xs text-slate-400">—</span>}>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditSite(site)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDeleteSite(site.id)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </Can>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredSites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">Aucun site trouvé</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Client form dialog */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom *</Label>
              <Input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Contact</Label>
              <Input value={clientForm.contact_name} onChange={e => setClientForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={clientForm.client_type} onValueChange={v => setClientForm(f => ({ ...f, client_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entreprise">Entreprise</SelectItem>
                  <SelectItem value="professionnel">Professionnel libéral</SelectItem>
                  <SelectItem value="syndic">Syndic</SelectItem>
                  <SelectItem value="particulier">Particulier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={clientForm.status} onValueChange={v => setClientForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Adresse de facturation</Label>
              <Input value={clientForm.billing_address} onChange={e => setClientForm(f => ({ ...f, billing_address: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientForm(false)}>Annuler</Button>
            <Button onClick={handleSaveClient}>{editingClient ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site form dialog */}
      <Dialog open={showSiteForm} onOpenChange={setShowSiteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={siteForm.client_id} onValueChange={v => setSiteForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Nom du site *</Label>
              <Input value={siteForm.name} onChange={e => setSiteForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Bureaux 3e étage" />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={siteForm.address} onChange={e => setSiteForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={siteForm.city} onChange={e => setSiteForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Surface (m²)</Label>
              <Input type="number" value={siteForm.surface_area} onChange={e => setSiteForm(f => ({ ...f, surface_area: e.target.value }))} />
            </div>
            <div>
              <Label>Code d'accès</Label>
              <Input value={siteForm.access_code} onChange={e => setSiteForm(f => ({ ...f, access_code: e.target.value }))} />
            </div>
            <div>
              <Label>Type de service</Label>
              <Select value={siteForm.service_type} onValueChange={v => setSiteForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
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
              <Label>Fréquence</Label>
              <Select value={siteForm.frequency} onValueChange={v => setSiteForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
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
              <Label>Instructions d'accès</Label>
              <Textarea value={siteForm.access_instructions} onChange={e => setSiteForm(f => ({ ...f, access_instructions: e.target.value }))} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={siteForm.notes} onChange={e => setSiteForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteForm(false)}>Annuler</Button>
            <Button onClick={handleSaveSite}>{editingSite ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteClient}
        onOpenChange={() => setConfirmDeleteClient(null)}
        title="Supprimer le client"
        description={`Tous les sites associés seront également supprimés. Cette action est irréversible.`}
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
