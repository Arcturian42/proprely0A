'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { Site } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, MapPin, Phone, Mail, Building2, Edit2, Save, X,
  Plus, Trash2, ExternalLink, AlertTriangle, Clock, Users,
  CheckCircle2, Navigation, TrendingUp, Euro,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(['prevue', 'en_cours', 'a_valider'])

function mapsUrl(address: string | null, city: string | null) {
  const q = [address, city].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

const defaultSiteForm = {
  name: '', address: '', city: '', surface_area: '',
  access_code: '', access_instructions: '', service_type: '', frequency: '', notes: '',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => { document.title = 'Client — Proprely' }, [])

  const { clients, sites, missions, timeEntries, updateClient, addSite, updateSite, deleteSite } = useAppStore()

  const client = clients.find(c => c.id === id)
  const clientSites = useMemo(() => sites.filter(s => s.client_id === id), [sites, id])
  const clientMissions = useMemo(() => missions.filter(m => m.client_id === id), [missions, id])
  const clientEntries = useMemo(() => timeEntries.filter(te => te.client_id === id), [timeEntries, id])

  // ── Info tab — inline edit ────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [infoForm, setInfoForm] = useState({
    name: '', contact_name: '', email: '', phone: '',
    billing_address: '', city: '', client_type: '', status: 'actif', notes: '',
  })

  useEffect(() => {
    if (client) {
      document.title = `${client.name} — Proprely`
      setInfoForm({
        name: client.name,
        contact_name: client.contact_name || '',
        email: client.email || '',
        phone: client.phone || '',
        billing_address: client.billing_address || '',
        city: client.city || '',
        client_type: client.client_type || '',
        status: client.status,
        notes: client.notes || '',
      })
    }
  }, [client])

  const handleSaveInfo = () => {
    if (!infoForm.name) { toast.error('Nom requis'); return }
    updateClient(id, { ...infoForm, updated_at: new Date().toISOString() })
    setEditing(false)
    toast.success('Client mis à jour')
  }

  // ── Sites tab ─────────────────────────────────────────────────────────────
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [siteForm, setSiteForm] = useState(defaultSiteForm)
  const [confirmDeleteSite, setConfirmDeleteSite] = useState<string | null>(null)

  const handleOpenCreateSite = () => {
    setEditingSite(null)
    setSiteForm(defaultSiteForm)
    setShowSiteForm(true)
  }

  const handleOpenEditSite = (site: Site) => {
    setEditingSite(site)
    setSiteForm({
      name: site.name,
      address: site.address || '',
      city: site.city || '',
      surface_area: site.surface_area?.toString() || '',
      access_code: site.access_code || '',
      access_instructions: site.access_instructions || '',
      service_type: site.service_type || '',
      frequency: site.frequency || '',
      notes: site.notes || '',
    })
    setShowSiteForm(true)
  }

  const handleSaveSite = () => {
    if (!siteForm.name) { toast.error('Nom du site requis'); return }
    const parsed = {
      ...siteForm,
      surface_area: siteForm.surface_area ? parseFloat(siteForm.surface_area) : null,
    }
    if (editingSite) {
      updateSite(editingSite.id, { ...parsed, updated_at: new Date().toISOString() })
      toast.success('Site mis à jour')
    } else {
      const newSite: Site = {
        id: `site-${Date.now()}`,
        company_id: 'company-1',
        client_id: id,
        ...parsed,
        sop_id: null,
        created_from_opportunity_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client,
      }
      addSite(newSite)
      toast.success('Site créé')
    }
    setShowSiteForm(false)
  }

  const handleDeleteSite = (siteId: string) => {
    const hasActiveMissions = missions.some(
      m => m.site_id === siteId && ACTIVE_STATUSES.has(m.status)
    )
    if (hasActiveMissions) {
      toast.error('Impossible de supprimer ce site : il a des missions actives.')
      setConfirmDeleteSite(null)
      return
    }
    deleteSite(siteId)
    toast.success('Site supprimé')
    setConfirmDeleteSite(null)
  }

  // ── Missions tab ──────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('all')
  const filteredMissions = useMemo(() =>
    clientMissions
      .filter(m => filterStatus === 'all' || m.status === filterStatus)
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [clientMissions, filterStatus]
  )

  // ── Rentabilité tab ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPlanned = clientEntries.reduce((s, e) => s + e.planned_hours, 0)
    const totalValidated = clientEntries.reduce((s, e) => s + (e.validated_hours || 0), 0)
    const totalCost = clientEntries.reduce((s, e) => s + (e.total_cost || 0), 0)
    const bySite = clientSites.map(site => {
      const entries = clientEntries.filter(e => e.site_id === site.id)
      return {
        site,
        planned: entries.reduce((s, e) => s + e.planned_hours, 0),
        validated: entries.reduce((s, e) => s + (e.validated_hours || 0), 0),
        cost: entries.reduce((s, e) => s + (e.total_cost || 0), 0),
        missionCount: clientMissions.filter(m => m.site_id === site.id).length,
      }
    })
    return { totalPlanned, totalValidated, totalCost, bySite }
  }, [clientEntries, clientSites, clientMissions])

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!client) {
    return (
      <AdminLayout>
        <div className="p-8 text-center py-24">
          <p className="text-slate-500 mb-4">Client introuvable.</p>
          <Button variant="outline" onClick={() => router.push('/commercial/clients-sites')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const hasNoSites = clientSites.length === 0
  const activeMissions = clientMissions.filter(m => ACTIVE_STATUSES.has(m.status))

  return (
    <AdminLayout>
      <div className="p-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/commercial/clients-sites')} className="mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <StatusBadge status={client.status} />
              {hasNoSites && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="w-3 h-3" /> Aucun site
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {client.contact_name && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client.contact_name}</span>
              )}
              {client.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
              )}
              {client.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">{clientSites.length} site(s)</Badge>
            <Badge variant="outline" className="text-xs">{clientMissions.length} mission(s)</Badge>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="info">
          <TabsList className="mb-6">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="sites">
              Sites
              {hasNoSites && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="missions">Missions ({clientMissions.length})</TabsTrigger>
            <TabsTrigger value="rentabilite">Rentabilité</TabsTrigger>
          </TabsList>

          {/* ── Tab: Info ─────────────────────────────────────────────────── */}
          <TabsContent value="info">
            <Card className="max-w-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base">Informations client</CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Edit2 className="w-3 h-3" /> Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(false) }}>
                      <X className="w-3 h-3 mr-1" /> Annuler
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={handleSaveInfo}>
                      <Save className="w-3 h-3" /> Sauvegarder
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nom *</Label>
                      <Input value={infoForm.name} onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Contact</Label>
                      <Input value={infoForm.contact_name} onChange={e => setInfoForm(f => ({ ...f, contact_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={infoForm.phone} onChange={e => setInfoForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={infoForm.email} onChange={e => setInfoForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input value={infoForm.city} onChange={e => setInfoForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={infoForm.client_type} onValueChange={v => setInfoForm(f => ({ ...f, client_type: v }))}>
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
                      <Select value={infoForm.status} onValueChange={v => setInfoForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="inactif">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Adresse de facturation</Label>
                      <Input value={infoForm.billing_address} onChange={e => setInfoForm(f => ({ ...f, billing_address: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea rows={3} value={infoForm.notes} onChange={e => setInfoForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[
                      { label: 'Contact', value: client.contact_name },
                      { label: 'Email', value: client.email },
                      { label: 'Téléphone', value: client.phone },
                      { label: 'Ville', value: client.city },
                      { label: 'Adresse facturation', value: client.billing_address },
                      { label: 'Type', value: client.client_type },
                      { label: 'Client depuis', value: formatDate(client.created_at) },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="py-2.5 flex items-start gap-6">
                        <span className="text-xs text-slate-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-slate-900">{value}</span>
                      </div>
                    ) : null)}
                    {client.notes && (
                      <div className="pt-3">
                        <p className="text-xs text-slate-400 mb-1">Notes</p>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{client.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Sites ────────────────────────────────────────────────── */}
          <TabsContent value="sites">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">{clientSites.length} site(s) pour ce client</p>
              <Button onClick={handleOpenCreateSite} className="gap-2">
                <Plus className="w-4 h-4" /> Ajouter un site
              </Button>
            </div>

            {hasNoSites && (
              <Card className="border-amber-200 bg-amber-50 mb-4">
                <CardContent className="p-4 flex items-center gap-3 text-amber-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">Ce client n'a aucun site. Ajoutez un site pour pouvoir planifier des missions.</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clientSites.map(site => {
                const siteMissions = clientMissions.filter(m => m.site_id === site.id)
                const missingAccess = !site.access_instructions
                const hasAddress = !!(site.address || site.city)

                return (
                  <Card key={site.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{site.name}</p>
                            {missingAccess && (
                              <Badge variant="warning" className="gap-1 text-xs">
                                <AlertTriangle className="w-2.5 h-2.5" /> Accès manquant
                              </Badge>
                            )}
                          </div>
                          {hasAddress && (
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[site.address, site.city].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditSite(site)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDeleteSite(site.id)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {site.service_type && <Badge variant="secondary" className="text-xs">{site.service_type}</Badge>}
                        {site.frequency && <Badge variant="outline" className="text-xs">{site.frequency}</Badge>}
                        {site.surface_area && <Badge variant="outline" className="text-xs">{site.surface_area} m²</Badge>}
                      </div>

                      {site.access_instructions && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mb-3">
                          <p className="text-xs font-medium text-indigo-700 mb-1">Instructions d'accès</p>
                          <p className="text-xs text-indigo-800 leading-relaxed">{site.access_instructions}</p>
                        </div>
                      )}

                      {site.access_code && (
                        <p className="text-xs text-slate-500 mb-3">Code d'accès : <span className="font-mono font-medium text-slate-700">{site.access_code}</span></p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{siteMissions.length} mission(s)</span>
                        {hasAddress && (
                          <a
                            href={mapsUrl(site.address, site.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            <Navigation className="w-3 h-3" /> Itinéraire
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* ── Tab: Missions ─────────────────────────────────────────────── */}
          <TabsContent value="missions">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-slate-500 flex-1">{filteredMissions.length} mission(s)</p>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="prevue">Prévue</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="a_valider">À valider</SelectItem>
                  <SelectItem value="terminee">Terminée</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                  <SelectItem value="probleme_signale">Problème</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredMissions.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="font-medium">Aucune mission</p>
                <p className="text-sm text-slate-400 mt-1">Planifiez une mission depuis le cockpit opérationnel</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMissions.map(mission => (
                  <Card key={mission.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-bold text-slate-900">{formatDate(mission.scheduled_date)}</p>
                        {mission.start_time && <p className="text-xs text-slate-400">{mission.start_time}</p>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{mission.site?.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {mission.planned_hours}h
                          </span>
                          {mission.agents && mission.agents.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {mission.agents.map(a => `${a.first_name} ${a.last_name?.[0] ?? ''}.`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={mission.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Rentabilité ──────────────────────────────────────────── */}
          <TabsContent value="rentabilite">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 mb-1">Heures prévues</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalPlanned.toFixed(1)}<span className="text-base font-normal text-slate-400 ml-1">h</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 mb-1">Heures validées</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalValidated.toFixed(1)}<span className="text-base font-normal text-slate-400 ml-1">h</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 mb-1">Coût main d'œuvre</p>
                  <p className="text-3xl font-bold text-indigo-600">{formatCurrency(stats.totalCost)}</p>
                </CardContent>
              </Card>
            </div>

            {stats.bySite.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Répartition par site</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.bySite.map(({ site, planned, validated, cost, missionCount }) => {
                      const pct = stats.totalPlanned > 0 ? (planned / stats.totalPlanned) * 100 : 0
                      return (
                        <div key={site.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{site.name}</p>
                              <span className="text-xs text-slate-400">{missionCount} mission(s)</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-500">{validated.toFixed(1)}h validées</span>
                              <span className="font-medium text-indigo-600">{formatCurrency(cost)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{planned.toFixed(1)}h prévues · {pct.toFixed(0)}% du total</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {clientEntries.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Euro className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="font-medium">Aucune donnée de rentabilité</p>
                <p className="text-sm text-slate-400 mt-1">Les données apparaîtront après la validation des premières heures</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Site form dialog ────────────────────────────────────────────────── */}
      <Dialog open={showSiteForm} onOpenChange={setShowSiteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom du site *</Label>
              <Input
                value={siteForm.name}
                onChange={e => setSiteForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Bureaux 3e étage, Entrepôt Nord"
              />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={siteForm.address} onChange={e => setSiteForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Rue de la Paix" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={siteForm.city} onChange={e => setSiteForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Surface (m²)</Label>
              <Input type="number" min="0" value={siteForm.surface_area} onChange={e => setSiteForm(f => ({ ...f, surface_area: e.target.value }))} />
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
            <div>
              <Label>Code d'accès</Label>
              <Input value={siteForm.access_code} onChange={e => setSiteForm(f => ({ ...f, access_code: e.target.value }))} placeholder="Ex: A1234#" />
            </div>
            <div className="col-span-2">
              <Label className="flex items-center gap-2">
                Instructions d'accès
                <span className="text-xs text-amber-600 font-normal">(important pour les agents)</span>
              </Label>
              <Textarea
                rows={3}
                value={siteForm.access_instructions}
                onChange={e => setSiteForm(f => ({ ...f, access_instructions: e.target.value }))}
                placeholder="Ex: Interphone 3B, code portail 1234#, clé dans la boîte à droite..."
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={siteForm.notes} onChange={e => setSiteForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteForm(false)}>Annuler</Button>
            <Button onClick={handleSaveSite}>{editingSite ? 'Mettre à jour' : 'Créer le site'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteSite}
        onOpenChange={open => { if (!open) setConfirmDeleteSite(null) }}
        title="Supprimer le site"
        description="Cette action est irréversible. Le site sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDeleteSite && handleDeleteSite(confirmDeleteSite)}
      />
    </AdminLayout>
  )
}
