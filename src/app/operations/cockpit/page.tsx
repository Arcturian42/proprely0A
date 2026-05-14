'use client'

import { useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { Agent, Mission, OperationalItem, OperationalItemStatus } from '@/types'
import { OPERATIONAL_ITEM_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, ArrowRight, Wrench, Calendar, Users, CheckCircle2, Search, MoreVertical, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const STATUS_COLUMNS: OperationalItemStatus[] = ['a_organiser', 'en_cours', 'planifie']

export default function CockpitPage() {
  const {
    operationalItems, missions, agents: storeAgents, clients, sites, sops,
    addMission, updateOperationalItem, deleteOperationalItem,
  } = useAppStore()

  const items: OperationalItem[] = operationalItems.map(item => ({
    ...item,
    client: clients.find(c => c.id === item.client_id),
    site: sites.find(s => s.id === item.site_id),
  }))

  const [showMissionForm, setShowMissionForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OperationalItem | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [missionForm, setMissionForm] = useState({
    scheduled_date: '', start_time: '', planned_hours: '2', sop_id: '', notes: '', priority: 'normale',
  })
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<OperationalItem | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null)

  const handleOpenCreateMission = (item: OperationalItem) => {
    setSelectedItem(item)
    setSelectedAgents([])
    setMissionForm({ scheduled_date: '', start_time: '', planned_hours: '2', sop_id: '', notes: '', priority: 'normale' })
    setShowMissionForm(true)
  }

  const handleCreateMission = () => {
    if (!selectedItem || !missionForm.scheduled_date || selectedAgents.length === 0) {
      toast.error('Date et au moins un agent requis')
      return
    }

    const agents = storeAgents.filter(a => selectedAgents.includes(a.id))
    const client = clients.find(c => c.id === selectedItem.client_id)
    const site = sites.find(s => s.id === selectedItem.site_id)
    const sop = sops.find(s => s.id === missionForm.sop_id)

    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      company_id: 'company-1',
      client_id: selectedItem.client_id,
      site_id: selectedItem.site_id,
      operational_item_id: selectedItem.id,
      service_type: site?.service_type || null,
      sop_id: missionForm.sop_id || null,
      status: 'prevue',
      scheduled_date: missionForm.scheduled_date,
      start_time: missionForm.start_time || null,
      planned_hours: parseFloat(missionForm.planned_hours) || 2,
      notes: missionForm.notes || null,
      priority: missionForm.priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client,
      site,
      agents,
      sop,
    }

    addMission(newMission)
    updateOperationalItem(selectedItem.id, {
      converted_to_mission: true,
      mission_id: newMission.id,
      status: 'planifie' as OperationalItemStatus,
      updated_at: new Date().toISOString(),
    })
    toast.success(`Mission créée pour ${client?.name} – ${site?.name}`)
    setShowMissionForm(false)
  }

  const handleUpdateStatus = (item: OperationalItem, status: OperationalItemStatus) => {
    updateOperationalItem(item.id, { status, updated_at: new Date().toISOString() })
  }

  const handleDeleteItem = (id: string) => {
    deleteOperationalItem(id)
    toast.success('Opération supprimée')
    setConfirmDeleteItem(null)
  }

  const filteredItems = items.filter(i =>
    !search ||
    i.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.site?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.title?.toLowerCase().includes(search.toLowerCase())
  )

  const itemsByStatus = (status: OperationalItemStatus) => filteredItems.filter(i => i.status === status)

  const STATUS_COLORS: Record<OperationalItemStatus, string> = {
    a_organiser: 'border-t-amber-400',
    en_cours: 'border-t-blue-400',
    planifie: 'border-t-green-400',
    annule: 'border-t-slate-300',
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Cockpit opérationnel"
          description="Suivi et organisation des opérations"
        />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{items.filter(i => i.status === 'a_organiser').length}</p>
              <p className="text-sm text-slate-500">À organiser</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{items.filter(i => i.status === 'en_cours').length}</p>
              <p className="text-sm text-slate-500">En cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{items.filter(i => i.status === 'planifie').length}</p>
              <p className="text-sm text-slate-500">Planifiés</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Rechercher par client ou site..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* 3-column kanban */}
        <div className="grid grid-cols-3 gap-4">
          {STATUS_COLUMNS.map(status => (
            <div key={status}>
              <div className={`bg-white rounded-xl border-t-4 ${STATUS_COLORS[status]} border border-slate-200 p-3 mb-3`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">{OPERATIONAL_ITEM_STATUS_LABELS[status]}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{itemsByStatus(status).length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {itemsByStatus(status).map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-sm text-slate-900 flex-1">{item.title}</p>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant={item.priority === 'haute' ? 'warning' : 'secondary'} className="text-xs">
                            {item.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-slate-100" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="w-3 h-3 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewItem(item)}>
                                <Eye className="w-3 h-3 mr-2" /> Voir détail
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDeleteItem(item.id)}>
                                <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{item.client?.name}</p>
                      <p className="text-xs text-slate-400 mb-3">{item.site?.name}</p>

                      {item.converted_to_mission ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Mission créée
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {status === 'a_organiser' && (
                            <Button size="sm" className="w-full gap-1 text-xs" onClick={() => handleUpdateStatus(item, 'en_cours')}>
                              <ArrowRight className="w-3 h-3" /> Prendre en charge
                            </Button>
                          )}
                          {(status === 'en_cours' || status === 'a_organiser') && (
                            <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => handleOpenCreateMission(item)}>
                              <Calendar className="w-3 h-3" /> Créer mission
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {itemsByStatus(status).length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                    <p className="text-xs text-slate-400">Aucune opération</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent missions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Missions récentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.slice(0, 6).map(mission => (
              <Card key={mission.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{mission.client?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{mission.site?.name}</p>
                    </div>
                    <StatusBadge status={mission.status} />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>{formatDate(mission.scheduled_date)} {mission.start_time && `à ${mission.start_time}`}</p>
                    <p>{mission.planned_hours}h · {mission.agents?.map(a => a.first_name).join(', ')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Mission creation dialog */}
      <Dialog open={showMissionForm} onOpenChange={setShowMissionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une mission</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium">{selectedItem.title}</p>
              <p className="text-slate-500">{selectedItem.client?.name} – {selectedItem.site?.name}</p>
            </div>
          )}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={missionForm.scheduled_date} onChange={e => setMissionForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <Label>Heure de début</Label>
                <Input type="time" value={missionForm.start_time} onChange={e => setMissionForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>Durée prévue (h)</Label>
                <Input type="number" min="0.5" step="0.5" value={missionForm.planned_hours} onChange={e => setMissionForm(f => ({ ...f, planned_hours: e.target.value }))} />
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={missionForm.priority} onValueChange={v => setMissionForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Protocole SOP</Label>
              <Select value={missionForm.sop_id} onValueChange={v => setMissionForm(f => ({ ...f, sop_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un protocole..." /></SelectTrigger>
                <SelectContent>
                  {sops.map(sop => (
                    <SelectItem key={sop.id} value={sop.id}>{sop.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Agents assignés *</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {storeAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <Checkbox
                      id={agent.id}
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAgents(prev =>
                          checked ? [...prev, agent.id] : prev.filter(id => id !== agent.id)
                        )
                      }}
                    />
                    <label htmlFor={agent.id} className="flex-1 text-sm cursor-pointer">
                      <span className="font-medium">{agent.first_name} {agent.last_name}</span>
                      <span className="text-slate-500 ml-2">{agent.zone}</span>
                    </label>
                    <StatusBadge status={agent.status} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={missionForm.notes} onChange={e => setMissionForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMissionForm(false)}>Annuler</Button>
            <Button onClick={handleCreateMission}>Créer la mission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Item detail dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détail de l'opération</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Titre:</span> {viewItem.title}</p>
              <p><span className="font-medium">Client:</span> {viewItem.client?.name}</p>
              <p><span className="font-medium">Site:</span> {viewItem.site?.name}</p>
              <p><span className="font-medium">Priorité:</span> {viewItem.priority}</p>
              <p><span className="font-medium">Statut:</span> {viewItem.status}</p>
              {viewItem.notes && <p><span className="font-medium">Notes:</span> {viewItem.notes}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteItem}
        onOpenChange={(open) => { if (!open) setConfirmDeleteItem(null) }}
        title="Supprimer l'opération"
        description="Cette action est irréversible. Voulez-vous vraiment supprimer cette opération ?"
        onConfirm={() => confirmDeleteItem && handleDeleteItem(confirmDeleteItem)}
        variant="destructive"
      />
    </AdminLayout>
  )
}
