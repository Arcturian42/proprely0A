'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ServiceType } from '@/types'
import { Plus, Edit, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAppStore } from '@/lib/store'

export default function ParametresPage() {
  useEffect(() => { document.title = 'Paramètres — Proprely' }, [])
  const {
    serviceTypes, addServiceType, updateServiceType, deleteServiceType,
    companySettings, updateCompanySettings,
  } = useAppStore()

  const [companyForm, setCompanyForm] = useState({
    name: companySettings.name,
    email: companySettings.email,
    phone: companySettings.phone,
    address: companySettings.address,
    siret: companySettings.siret,
  })

  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingService, setEditingService] = useState<ServiceType | null>(null)
  const [serviceForm, setServiceForm] = useState({ name: '', estimated_duration_minutes: '', indicative_price: '' })
  const [confirmDeleteService, setConfirmDeleteService] = useState<string | null>(null)

  const handleSaveCompany = () => {
    updateCompanySettings(companyForm)
    toast.success('Paramètres entreprise sauvegardés')
  }

  const handleSaveService = () => {
    if (!serviceForm.name) { toast.error('Nom requis'); return }
    if (editingService) {
      updateServiceType(editingService.id, {
        ...serviceForm,
        estimated_duration_minutes: serviceForm.estimated_duration_minutes ? parseInt(serviceForm.estimated_duration_minutes) : null,
        indicative_price: serviceForm.indicative_price ? parseFloat(serviceForm.indicative_price) : null,
        updated_at: new Date().toISOString(),
      })
      toast.success('Service mis à jour')
    } else {
      const newService: ServiceType = {
        id: crypto.randomUUID(), company_id: companySettings.id ?? '', ...serviceForm,
        estimated_duration_minutes: serviceForm.estimated_duration_minutes ? parseInt(serviceForm.estimated_duration_minutes) : null,
        indicative_price: serviceForm.indicative_price ? parseFloat(serviceForm.indicative_price) : null,
        default_sop_id: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addServiceType(newService)
      toast.success('Type de service créé')
    }
    setShowServiceForm(false)
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader title="Paramètres" description="Configuration de votre espace Proprely" />

        <Tabs defaultValue="company">
          <TabsList className="mb-6">
            <TabsTrigger value="company">Mon entreprise</TabsTrigger>
            <TabsTrigger value="services">Types de services</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Informations entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={companyForm.email} onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input value={companyForm.address} onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <Label>N° SIRET</Label>
                  <Input value={companyForm.siret} onChange={e => setCompanyForm(f => ({ ...f, siret: e.target.value }))} />
                </div>
                <Button className="gap-2" onClick={handleSaveCompany}>
                  <Save className="w-4 h-4" /> Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingService(null); setServiceForm({ name: '', estimated_duration_minutes: '', indicative_price: '' }); setShowServiceForm(true) }} className="gap-2">
                <Plus className="w-4 h-4" /> Nouveau type
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Durée estimée</TableHead>
                    <TableHead>Prix indicatif</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map(service => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.estimated_duration_minutes ? `${service.estimated_duration_minutes} min` : '—'}</TableCell>
                      <TableCell>{service.indicative_price ? `${service.indicative_price} €` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditingService(service)
                            setServiceForm({
                              name: service.name,
                              estimated_duration_minutes: service.estimated_duration_minutes?.toString() || '',
                              indicative_price: service.indicative_price?.toString() || '',
                            })
                            setShowServiceForm(true)
                          }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDeleteService(service.id)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Préférences de notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium">Rappels de missions</p>
                    <p className="text-xs text-slate-500">Rappel 1h avant chaque mission</p>
                  </div>
                  <Badge variant="success">Activé</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium">Alertes problèmes</p>
                    <p className="text-xs text-slate-500">Notification immédiate si problème signalé</p>
                  </div>
                  <Badge variant="success">Activé</Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">Résumé hebdomadaire</p>
                    <p className="text-xs text-slate-500">Email récapitulatif chaque lundi matin</p>
                  </div>
                  <Badge variant="secondary">Désactivé</Badge>
                </div>
                <p className="text-xs text-slate-400">Configuration des notifications disponible prochainement.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Service type form */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Modifier le service' : 'Nouveau type de service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Durée estimée (min)</Label>
              <Input type="number" value={serviceForm.estimated_duration_minutes} onChange={e => setServiceForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))} />
            </div>
            <div>
              <Label>Prix indicatif (€)</Label>
              <Input type="number" value={serviceForm.indicative_price} onChange={e => setServiceForm(f => ({ ...f, indicative_price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceForm(false)}>Annuler</Button>
            <Button onClick={handleSaveService}>{editingService ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteService}
        onOpenChange={() => setConfirmDeleteService(null)}
        title="Supprimer le type de prestation"
        description="Ce type de prestation sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteService) {
            deleteServiceType(confirmDeleteService)
            toast.success('Type supprimé')
            setConfirmDeleteService(null)
          }
        }}
      />
    </AdminLayout>
  )
}
