'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry, MissionStatus, ServiceType
} from '@/types'
import {
  mockAgents, mockClients, mockLeads, mockMissions, mockOpportunities,
  mockOperationalItems, mockSites, mockSops, mockTimeEntries,
} from '@/lib/mock-data'

const defaultServiceTypes: ServiceType[] = [
  { id: 'st-1', company_id: 'company-1', name: 'Nettoyage bureaux', estimated_duration_minutes: 120, indicative_price: 150, default_sop_id: 'sop-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-2', company_id: 'company-1', name: 'Nettoyage médical', estimated_duration_minutes: 90, indicative_price: 120, default_sop_id: 'sop-2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-3', company_id: 'company-1', name: 'Vitrerie', estimated_duration_minutes: 180, indicative_price: 200, default_sop_id: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

interface CompanySettings {
  name: string
  email: string
  phone: string
  address: string
  siret: string
}

const defaultCompanySettings: CompanySettings = {
  name: 'Proprely Nettoyage Pro',
  email: 'contact@proprely.fr',
  phone: '01 23 45 67 89',
  address: '10 Rue de la Propreté, Paris',
  siret: '12345678901234',
}

interface AppStore {
  agents: Agent[]
  clients: Client[]
  leads: Lead[]
  missions: Mission[]
  opportunities: Opportunity[]
  operationalItems: OperationalItem[]
  sites: Site[]
  sops: Sop[]
  timeEntries: TimeEntry[]
  serviceTypes: ServiceType[]
  companySettings: CompanySettings

  // Agents
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, data: Partial<Agent>) => void
  deleteAgent: (id: string) => void

  // Clients
  addClient: (client: Client) => void
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void

  // Sites
  addSite: (site: Site) => void
  updateSite: (id: string, data: Partial<Site>) => void
  deleteSite: (id: string) => void

  // Leads
  addLead: (lead: Lead) => void
  updateLead: (id: string, data: Partial<Lead>) => void
  deleteLead: (id: string) => void

  // Opportunities
  addOpportunity: (opp: Opportunity) => void
  updateOpportunity: (id: string, data: Partial<Opportunity>) => void
  deleteOpportunity: (id: string) => void
  winOpportunity: (id: string) => void

  // Missions
  addMission: (mission: Mission) => void
  updateMission: (id: string, data: Partial<Mission>) => void
  deleteMission: (id: string) => void
  updateMissionStatus: (id: string, status: MissionStatus, validatedHours?: number) => void

  // OperationalItems
  addOperationalItem: (item: OperationalItem) => void
  updateOperationalItem: (id: string, data: Partial<OperationalItem>) => void
  deleteOperationalItem: (id: string) => void

  // SOPs
  addSop: (sop: Sop) => void
  updateSop: (id: string, data: Partial<Sop>) => void
  deleteSop: (id: string) => void

  // TimeEntries
  addTimeEntry: (entry: TimeEntry) => void
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => void

  // ServiceTypes
  addServiceType: (serviceType: ServiceType) => void
  updateServiceType: (id: string, data: Partial<ServiceType>) => void
  deleteServiceType: (id: string) => void

  // Company settings
  updateCompanySettings: (settings: Partial<CompanySettings>) => void

  // Reset
  resetToMockData: () => void
}


export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      agents: mockAgents,
      clients: mockClients,
      leads: mockLeads,
      missions: mockMissions,
      opportunities: mockOpportunities,
      operationalItems: mockOperationalItems,
      sites: mockSites,
      sops: mockSops,
      timeEntries: mockTimeEntries,
      serviceTypes: defaultServiceTypes,
      companySettings: defaultCompanySettings,

      // Agents
      addAgent: (agent) => set(s => ({ agents: [...s.agents, agent] })),
      updateAgent: (id, data) => set(s => ({
        agents: s.agents.map(a => a.id === id ? { ...a, ...data } : a)
      })),
      deleteAgent: (id) => set(s => ({
        agents: s.agents.filter(a => a.id !== id),
      })),

      // Clients
      addClient: (client) => set(s => ({ clients: [...s.clients, client] })),
      updateClient: (id, data) => set(s => ({
        clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c)
      })),
      deleteClient: (id) => set(s => {
        const deletedMissionIds = new Set(
          s.missions.filter(m => m.client_id === id || m.client?.id === id).map(m => m.id)
        )
        return {
          clients: s.clients.filter(c => c.id !== id),
          sites: s.sites.filter(s2 => s2.client_id !== id),
          missions: s.missions.filter(m => !deletedMissionIds.has(m.id)),
          timeEntries: s.timeEntries.filter(te => !deletedMissionIds.has(te.mission_id)),
        }
      }),

      // Sites
      addSite: (site) => set(s => ({ sites: [...s.sites, site] })),
      updateSite: (id, data) => set(s => ({
        sites: s.sites.map(s2 => s2.id === id ? { ...s2, ...data } : s2)
      })),
      deleteSite: (id) => set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) })),

      // Leads
      addLead: (lead) => set(s => ({ leads: [...s.leads, lead] })),
      updateLead: (id, data) => set(s => ({
        leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l)
      })),
      deleteLead: (id) => set(s => ({ leads: s.leads.filter(l => l.id !== id) })),

      // Opportunities
      addOpportunity: (opp) => set(s => ({ opportunities: [...s.opportunities, opp] })),
      updateOpportunity: (id, data) => set(s => ({
        opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o)
      })),
      deleteOpportunity: (id) => set(s => ({ opportunities: s.opportunities.filter(o => o.id !== id) })),
      winOpportunity: (id) => {
        const state = get()
        const opp = state.opportunities.find(o => o.id === id)
        if (!opp || opp.converted_to_client) return

        const clientId = crypto.randomUUID()
        const siteId = crypto.randomUUID()
        const itemId = crypto.randomUUID()
        const now = new Date().toISOString()

        const newClient: Client = {
          id: clientId, company_id: 'company-1',
          name: opp.prospect_name, contact_name: opp.contact_name,
          email: opp.email, phone: opp.phone,
          billing_address: opp.site_address, city: opp.city,
          client_type: opp.client_type, status: 'actif', notes: opp.notes,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newSite: Site = {
          id: siteId, company_id: 'company-1', client_id: clientId,
          name: `Site ${opp.prospect_name}`,
          address: opp.site_address, city: opp.city,
          service_type: opp.service_type,
          surface_area: null, access_code: null, access_instructions: null,
          frequency: null, sop_id: null, notes: null,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newItem: OperationalItem = {
          id: itemId, company_id: 'company-1',
          client_id: clientId, site_id: siteId,
          opportunity_id: opp.id,
          source: 'pipeline',
          title: `${opp.prospect_name} — à organiser`,
          status: 'a_organiser', priority: 'normal',
          notes: null, converted_to_mission: false, mission_id: null,
          created_at: now, updated_at: now,
        }

        set(s => ({
          opportunities: s.opportunities.map(o => o.id === id
            ? { ...o, stage: 'gagnee', converted_to_client: true, converted_at: now, client_id: clientId, site_id: siteId }
            : o
          ),
          clients: [...s.clients, newClient],
          sites: [...s.sites, newSite],
          operationalItems: [...s.operationalItems, newItem],
        }))
      },

      // Missions
      addMission: (mission) => set(s => ({ missions: [...s.missions, mission] })),
      updateMission: (id, data) => set(s => ({
        missions: s.missions.map(m => m.id === id ? { ...m, ...data } : m)
      })),
      deleteMission: (id) => set(s => ({ missions: s.missions.filter(m => m.id !== id) })),
      updateMissionStatus: (id, status, validatedHours) => {
        const now = new Date().toISOString()
        set(s => ({
          missions: s.missions.map(m => m.id === id ? { ...m, status, updated_at: now } : m),
          timeEntries: validatedHours !== undefined
            ? s.timeEntries.map(te => te.mission_id === id
                ? { ...te, status: 'validee', validated_hours: validatedHours, validated_at: now }
                : te
              )
            : s.timeEntries,
        }))
      },

      // OperationalItems
      addOperationalItem: (item) => set(s => ({ operationalItems: [...s.operationalItems, item] })),
      updateOperationalItem: (id, data) => set(s => ({
        operationalItems: s.operationalItems.map(i => i.id === id ? { ...i, ...data } : i)
      })),
      deleteOperationalItem: (id) => set(s => ({
        operationalItems: s.operationalItems.filter(i => i.id !== id)
      })),

      // SOPs
      addSop: (sop) => set(s => ({ sops: [...s.sops, sop] })),
      updateSop: (id, data) => set(s => ({
        sops: s.sops.map(s2 => s2.id === id ? { ...s2, ...data } : s2)
      })),
      deleteSop: (id) => set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) })),

      // TimeEntries
      addTimeEntry: (entry) => set(s => ({ timeEntries: [...s.timeEntries, entry] })),
      updateTimeEntry: (id, data) => set(s => ({
        timeEntries: s.timeEntries.map(te => te.id === id ? { ...te, ...data } : te)
      })),

      // ServiceTypes
      addServiceType: (serviceType) => set(s => ({ serviceTypes: [...s.serviceTypes, serviceType] })),
      updateServiceType: (id, data) => set(s => ({
        serviceTypes: s.serviceTypes.map(st => st.id === id ? { ...st, ...data } : st)
      })),
      deleteServiceType: (id) => set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) })),

      // Company settings
      updateCompanySettings: (settings) => set(s => ({ companySettings: { ...s.companySettings, ...settings } })),

      resetToMockData: () => set({
        agents: mockAgents, clients: mockClients, leads: mockLeads,
        missions: mockMissions, opportunities: mockOpportunities,
        operationalItems: mockOperationalItems, sites: mockSites,
        sops: mockSops, timeEntries: mockTimeEntries,
      }),
    }),
    {
      name: 'proprely-store',
    }
  )
)
