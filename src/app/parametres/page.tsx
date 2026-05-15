'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
      <div className="p-6 max-w-3xl bg-[#F8FAFC] min-h-screen">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[22px] font-bold text-[#0F172A]">Paramètres</h1>
          <p className="text-[13px] text-[#94A3B8] mt-0.5">Configuration de votre espace Proprely</p>
        </div>

        {/* Tabs */}
        <div className="bg-[#F1F5F9] rounded-[8px] p-1 flex gap-1 w-fit mb-5">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-[#0F172A]'
                    : 'text-[#94A3B8] hover:text-[#475569]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Company tab */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-5">
            <div className="p-5 border-b border-[#F1F5F9]">
              <p className="text-[15px] font-bold text-[#0F172A]">Informations entreprise</p>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">Vos coordonnées et informations légales</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Nom de l'entreprise</label>
                  <input
                    className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                    value={companyForm.name}
                    onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Email</label>
                  <input
                    type="email"
                    className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                    value={companyForm.email}
                    onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Téléphone</label>
                  <input
                    className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Adresse</label>
                  <input
                    className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                    value={companyForm.address}
                    onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#475569] mb-1 block">N° SIRET</label>
                  <input
                    className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                    value={companyForm.siret}
                    onChange={e => setCompanyForm(f => ({ ...f, siret: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveCompany}
                className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] flex items-center gap-2 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* Services tab */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-5">
            <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold text-[#0F172A]">Types de services</p>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">Gérez les prestations proposées</p>
              </div>
              <button
                onClick={() => { setEditingService(null); setServiceForm({ name: '', estimated_duration_minutes: '', indicative_price: '' }); setShowServiceForm(true) }}
                className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau type
              </button>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    {['Nom', 'Durée estimée', 'Prix indicatif', 'Actions'].map(h => (
                      <th key={h} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide px-5 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceTypes.map(service => (
                    <tr key={service.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3 text-[13px] font-semibold text-[#0F172A]">{service.name}</td>
                      <td className="px-5 py-3 text-[13px] text-[#475569]">{service.estimated_duration_minutes ? `${service.estimated_duration_minutes} min` : <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-5 py-3 text-[13px] text-[#475569]">{service.indicative_price ? `${service.indicative_price} €` : <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button
                            className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] transition-colors"
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
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="w-8 h-8 rounded-[6px] border border-[#E2E8F0] flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                            onClick={() => setConfirmDeleteService(service.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {serviceTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-[13px] text-[#94A3B8]">Aucun type de service</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-5">
            <div className="p-5 border-b border-[#F1F5F9]">
              <p className="text-[15px] font-bold text-[#0F172A]">Préférences de notifications</p>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">Gérez vos alertes et rappels</p>
            </div>
            <div className="p-5 space-y-1">
              {[
                { label: 'Rappels de missions', desc: 'Rappel 1h avant chaque mission', active: true },
                { label: 'Alertes problèmes', desc: 'Notification immédiate si problème signalé', active: true },
                { label: 'Résumé hebdomadaire', desc: 'Email récapitulatif chaque lundi matin', active: false },
              ].map((item, idx, arr) => (
                <div key={item.label} className={`flex items-center justify-between py-3.5 ${idx < arr.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0F172A]">{item.label}</p>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">{item.desc}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                    {item.active ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              ))}
              <p className="text-[12px] text-[#94A3B8] pt-2">Configuration des notifications disponible prochainement.</p>
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
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Nom *</label>
              <input
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={serviceForm.name}
                onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Durée estimée (min)</label>
              <input
                type="number"
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={serviceForm.estimated_duration_minutes}
                onChange={e => setServiceForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Prix indicatif (€)</label>
              <input
                type="number"
                className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                value={serviceForm.indicative_price}
                onChange={e => setServiceForm(f => ({ ...f, indicative_price: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceForm(false)}>Annuler</Button>
            <button
              onClick={handleSaveService}
              className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] transition-colors"
            >
              {editingService ? 'Mettre à jour' : 'Créer'}
            </button>
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
