'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ServiceType } from '@/types'
import { Plus, Edit, Trash2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAppStore } from '@/lib/store'
import { InvitationsPanel } from '@/components/settings/InvitationsPanel'
import { MembersPanel } from '@/components/settings/MembersPanel'
import { AuditLogPanel } from '@/components/settings/AuditLogPanel'
import { PricingSettingsPanel } from '@/components/settings/PricingSettingsPanel'
import { PriceCalculatorPanel } from '@/components/settings/PriceCalculatorPanel'
import { RecurrencesPanel } from '@/components/settings/RecurrencesPanel'
import { updateCompanyInfo } from '@/app/actions/data'
import { useCurrentCompanyId } from '@/lib/auth'
import { isSupabaseClient } from '@/lib/supabase/client-config'

const VALID_TABS = ['company', 'equipe', 'services', 'tarification', 'simulateur', 'recurrences', 'audit', 'notifications'] as const
type TabValue = (typeof VALID_TABS)[number]

export default function ParametresPage() {
  useEffect(() => { document.title = 'Paramètres — Proprely' }, [])
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const defaultTab: TabValue = VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'company'
  const companyId = useCurrentCompanyId()

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
  const [savingCompany, startSavingCompany] = useTransition()

  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingService, setEditingService] = useState<ServiceType | null>(null)
  const [serviceForm, setServiceForm] = useState({ name: '', estimated_duration_minutes: '', indicative_price: '' })
  const [confirmDeleteService, setConfirmDeleteService] = useState<string | null>(null)

  const handleSaveCompany = () => {
    // Local first for instant feedback, then mirror to Supabase if configured.
    updateCompanySettings(companyForm)
    if (!isSupabaseClient()) {
      toast.success('Paramètres entreprise sauvegardés (mode dev)')
      return
    }
    startSavingCompany(async () => {
      const fd = new FormData()
      fd.set('name', companyForm.name)
      fd.set('email', companyForm.email)
      fd.set('phone', companyForm.phone)
      fd.set('address', companyForm.address)
      const res = await updateCompanyInfo(fd)
      if (res.ok) {
        toast.success('Paramètres entreprise sauvegardés')
      } else {
        // res.error a déjà transité par toUserMessage côté serveur (data.ts)
        toast.error(res.error)
      }
    })
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
        id: `st-${Date.now()}`, company_id: companyId, ...serviceForm,
        description: null,
        estimated_duration_minutes: serviceForm.estimated_duration_minutes ? parseInt(serviceForm.estimated_duration_minutes) : null,
        indicative_price: serviceForm.indicative_price ? parseFloat(serviceForm.indicative_price) : null,
        default_sop_id: null,
        is_default: false,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      addServiceType(newService)
      toast.success('Type de service créé')
    }
    setShowServiceForm(false)
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <PageHeader title="Paramètres" description="Configuration de votre espace Proprely" />

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="company">Mon entreprise</TabsTrigger>
            <TabsTrigger value="equipe">Équipe</TabsTrigger>
            <TabsTrigger value="services">Types de services</TabsTrigger>
            <TabsTrigger value="tarification">Tarification</TabsTrigger>
            <TabsTrigger value="simulateur">Simulateur</TabsTrigger>
            <TabsTrigger value="recurrences">Récurrences</TabsTrigger>
            <TabsTrigger value="audit">Journal d&apos;audit</TabsTrigger>
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
                <Button className="gap-2" onClick={handleSaveCompany} disabled={savingCompany}>
                  {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipe">
            <div className="space-y-6 max-w-3xl">
              <InvitationsPanel />
              <MembersPanel />
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingService(null); setServiceForm({ name: '', estimated_duration_minutes: '', indicative_price: '' }); setShowServiceForm(true) }} className="gap-2">
                <Plus className="w-4 h-4" /> Nouveau type
              </Button>
            </div>
            <Card className="overflow-x-auto">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Modifier ${service.name}`}
                            onClick={() => {
                              setEditingService(service)
                              setServiceForm({
                                name: service.name,
                                estimated_duration_minutes: service.estimated_duration_minutes?.toString() || '',
                                indicative_price: service.indicative_price?.toString() || '',
                              })
                              setShowServiceForm(true)
                            }}
                          >
                            <Edit className="w-3 h-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Supprimer ${service.name}`}
                            onClick={() => setConfirmDeleteService(service.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="tarification">
            <PricingSettingsPanel />
          </TabsContent>

          <TabsContent value="simulateur">
            <PriceCalculatorPanel />
          </TabsContent>

          <TabsContent value="recurrences">
            <RecurrencesPanel />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogPanel />
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
