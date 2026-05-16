'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ServiceType } from '@/types'
import { Plus, Edit, Trash2, Save, Bell, Building2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAppStore } from '@/lib/store'

export default function ParametresPage() {
  useEffect(() => { document.title = 'Paramètres — Proprely' }, [])
  const {
    serviceTypes, addServiceType, updateServiceType, deleteServiceType,
    companySettings, updateCompanySettings,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'company' | 'services' | 'notifications'>('company')

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
        id: `st-${Date.now()}`, company_id: 'company-1', ...serviceForm,
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

  const tabs = [
    { key: 'company' as const, label: 'Mon entreprise', icon: Building2 },
    { key: 'services' as const, label: 'Types de services', icon: Layers },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
  ]

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuration de votre espace Proprely</p>
        </div>

        {/* Tabs bar */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={activeTab === tab.key
                  ? 'bg-white shadow-sm text-gray-900 rounded-md px-4 py-1.5 text-sm font-medium cursor-pointer flex items-center gap-2'
                  : 'px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-md cursor-pointer transition-colors flex items-center gap-2'
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Company tab */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="p-5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Informations entreprise</p>
              <p className="text-xs text-gray-500 mt-0.5">Vos coordonnées et informations légales</p>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Nom de l'entreprise</label>
                    <Input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
                    <Input type="email" value={companyForm.email} onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Téléphone</label>
                    <Input value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Adresse</label>
                    <Input value={companyForm.address} onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">N° SIRET</label>
                    <Input value={companyForm.siret} onChange={e => setCompanyForm(f => ({ ...f, siret: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleSaveCompany} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                  <Save className="w-3.5 h-3.5" /> Sauvegarder
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Services tab */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Types de services</p>
                <p className="text-xs text-gray-500 mt-0.5">Gérez les prestations proposées</p>
              </div>
              <Button
                onClick={() => { setEditingService(null); setServiceForm({ name: '', estimated_duration_minutes: '', indicative_price: '' }); setShowServiceForm(true) }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau type
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Nom', 'Durée estimée', 'Prix indicatif', 'Actions'].map(h => (
                      <th key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceTypes.map(service => (
                    <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{service.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{service.estimated_duration_minutes ? `${service.estimated_duration_minutes} min` : <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{service.indicative_price ? `${service.indicative_price} €` : <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditingService(service)
                            setServiceForm({
                              name: service.name,
                              estimated_duration_minutes: service.estimated_duration_minutes?.toString() || '',
                              indicative_price: service.indicative_price?.toString() || '',
                            })
                            setShowServiceForm(true)
                          }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmDeleteService(service.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {serviceTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-sm text-gray-400">Aucun type de service</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="p-5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Préférences de notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Gérez vos alertes et rappels</p>
            </div>
            <div className="p-5 space-y-1">
              {[
                { label: 'Rappels de missions', desc: 'Rappel 1h avant chaque mission', active: true },
                { label: 'Alertes problèmes', desc: 'Notification immédiate si problème signalé', active: true },
                { label: 'Résumé hebdomadaire', desc: 'Email récapitulatif chaque lundi matin', active: false },
              ].map((item, idx, arr) => (
                <div key={item.label} className={`flex items-center justify-between py-3.5 ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {item.active ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-2">Configuration des notifications disponible prochainement.</p>
            </div>
          </div>
        )}
      </div>

      {/* Service type form */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#0F172A]">
              {editingService ? 'Modifier le service' : 'Nouveau type de service'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Nom *</label>
              <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Durée estimée (min)</label>
              <Input type="number" value={serviceForm.estimated_duration_minutes} onChange={e => setServiceForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Prix indicatif (€)</label>
              <Input type="number" value={serviceForm.indicative_price} onChange={e => setServiceForm(f => ({ ...f, indicative_price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceForm(false)}>Annuler</Button>
            <Button onClick={handleSaveService} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingService ? 'Mettre à jour' : 'Créer'}
            </Button>
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
