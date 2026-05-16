'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function checkStorageSize() {
  try {
    const data = localStorage.getItem('proprely-store')
    if (data && data.length > 500_000) {
      console.warn(`[Proprely] Store size: ${(data.length / 1024).toFixed(0)}KB — consider archiving old data`)
    }
  } catch {}
}
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry, MissionStatus, ServiceType
} from '@/types'
import {
  mockAgents, mockClients, mockLeads, mockMissions, mockOpportunities,
  mockOperationalItems, mockSites, mockSops, mockTimeEntries,
} from '@/lib/mock-data'
import {
  fetchAllData,
  sbAddAgent, sbUpdateAgent, sbDeleteAgent,
  sbAddClient, sbUpdateClient, sbDeleteClient,
  sbAddSite, sbUpdateSite, sbDeleteSite,
  sbAddLead, sbUpdateLead, sbDeleteLead,
  sbAddOpportunity, sbUpdateOpportunity, sbDeleteOpportunity,
  sbAddMission, sbUpdateMission, sbUpdateMissionStatus,
  sbAddSop, sbUpdateSop, sbDeleteSop,
  sbAddTimeEntry, sbUpdateTimeEntry,
  sbAddOperationalItem, sbUpdateOperationalItem, sbDeleteOperationalItem,
} from '@/lib/supabase/queries'

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
  dashboardKpis: ('missions' | 'clients' | 'agents' | 'items' | 'revenue' | 'conversion')[]
  isLoading: boolean
  isInitialized: boolean
  loadFromSupabase: () => Promise<void>

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

  // Dashboard KPIs
  setDashboardKpis: (kpis: AppStore['dashboardKpis']) => void

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
      dashboardKpis: ['missions', 'clients', 'agents', 'items'] as AppStore['dashboardKpis'],
      isLoading: false,
      isInitialized: false,

      loadFromSupabase: async () => {
        set({ isLoading: true })
        try {
          const data = await fetchAllData()
          const agentsList = data.agents as Agent[]
          const enrichedMissions = (data.missions as (Mission & { mission_agents?: { agent_id: string }[] })[]).map(m => ({
            ...m,
            agents: (m.mission_agents ?? [])
              .map(ma => agentsList.find(a => a.id === ma.agent_id))
              .filter(Boolean) as Agent[],
          }))
          set({ ...data, missions: enrichedMissions, isInitialized: true, isLoading: false })
        } catch (e) {
          console.error('Failed to load from Supabase:', e)
          set({ isLoading: false, isInitialized: true })
        }
      },

      // Agents
      addAgent: (agent) => {
        set(s => ({ agents: [...s.agents, agent] }))
        sbAddAgent(agent).catch(console.error)
      },
      updateAgent: (id, data) => {
        set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...data } : a) }))
        sbUpdateAgent(id, data).catch(console.error)
      },
      deleteAgent: (id) => {
        set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
        sbDeleteAgent(id).catch(console.error)
      },

      // Clients
      addClient: (client) => {
        set(s => ({ clients: [...s.clients, client] }))
        sbAddClient(client).catch(console.error)
      },
      updateClient: (id, data) => {
        set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }))
        sbUpdateClient(id, data).catch(console.error)
      },
      deleteClient: (id) => {
        set(s => {
          const deletedMissionIds = new Set(
            s.missions.filter(m => m.client_id === id || m.client?.id === id).map(m => m.id)
          )
          return {
            clients: s.clients.filter(c => c.id !== id),
            sites: s.sites.filter(s2 => s2.client_id !== id),
            missions: s.missions.filter(m => !deletedMissionIds.has(m.id)),
            timeEntries: s.timeEntries.filter(te => !deletedMissionIds.has(te.mission_id)),
          }
        })
        sbDeleteClient(id).catch(console.error)
      },

      // Sites
      addSite: (site) => {
        set(s => ({ sites: [...s.sites, site] }))
        sbAddSite(site).catch(console.error)
      },
      updateSite: (id, data) => {
        set(s => ({ sites: s.sites.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
        sbUpdateSite(id, data).catch(console.error)
      },
      deleteSite: (id) => {
        set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) }))
        sbDeleteSite(id).catch(console.error)
      },

      // Leads
      addLead: (lead) => {
        set(s => ({ leads: [...s.leads, lead] }))
        sbAddLead(lead).catch(console.error)
      },
      updateLead: (id, data) => {
        set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l) }))
        sbUpdateLead(id, data).catch(console.error)
      },
      deleteLead: (id) => {
        set(s => ({ leads: s.leads.filter(l => l.id !== id) }))
        sbDeleteLead(id).catch(console.error)
      },

      // Opportunities
      addOpportunity: (opp) => {
        set(s => ({ opportunities: [...s.opportunities, opp] }))
        sbAddOpportunity(opp).catch(console.error)
      },
      updateOpportunity: (id, data) => {
        set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o) }))
        sbUpdateOpportunity(id, data).catch(console.error)
      },
      deleteOpportunity: (id) => {
        set(s => ({ opportunities: s.opportunities.filter(o => o.id !== id) }))
        sbDeleteOpportunity(id).catch(console.error)
      },
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
      addMission: (mission) => {
        set(s => ({ missions: [...s.missions, mission] }))
        const agentIds = (mission.agents ?? []).map(a => a.id)
        sbAddMission(mission, agentIds).catch(console.error)
      },
      updateMission: (id, data) => {
        set(s => ({ missions: s.missions.map(m => m.id === id ? { ...m, ...data } : m) }))
        sbUpdateMission(id, data).catch(console.error)
      },
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
        sbUpdateMissionStatus(id, status, validatedHours).catch(console.error)
      },

      // OperationalItems
      addOperationalItem: (item) => {
        set(s => ({ operationalItems: [...s.operationalItems, item] }))
        sbAddOperationalItem(item).catch(console.error)
      },
      updateOperationalItem: (id, data) => {
        set(s => ({ operationalItems: s.operationalItems.map(i => i.id === id ? { ...i, ...data } : i) }))
        sbUpdateOperationalItem(id, data).catch(console.error)
      },
      deleteOperationalItem: (id) => {
        set(s => ({ operationalItems: s.operationalItems.filter(i => i.id !== id) }))
        sbDeleteOperationalItem(id).catch(console.error)
      },

      // SOPs
      addSop: (sop) => {
        set(s => ({ sops: [...s.sops, sop] }))
        sbAddSop(sop).catch(console.error)
      },
      updateSop: (id, data) => {
        set(s => ({ sops: s.sops.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
        sbUpdateSop(id, data).catch(console.error)
      },
      deleteSop: (id) => {
        set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) }))
        sbDeleteSop(id).catch(console.error)
      },

      // TimeEntries
      addTimeEntry: (entry) => {
        set(s => ({ timeEntries: [...s.timeEntries, entry] }))
        sbAddTimeEntry(entry).catch(console.error)
      },
      updateTimeEntry: (id, data) => {
        set(s => ({ timeEntries: s.timeEntries.map(te => te.id === id ? { ...te, ...data } : te) }))
        sbUpdateTimeEntry(id, data).catch(console.error)
      },

      // ServiceTypes
      addServiceType: (serviceType) => set(s => ({ serviceTypes: [...s.serviceTypes, serviceType] })),
      updateServiceType: (id, data) => set(s => ({
        serviceTypes: s.serviceTypes.map(st => st.id === id ? { ...st, ...data } : st)
      })),
      deleteServiceType: (id) => set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) })),

      // Company settings
      updateCompanySettings: (settings) => set(s => ({ companySettings: { ...s.companySettings, ...settings } })),

      // Dashboard KPIs
      setDashboardKpis: (kpis) => set({ dashboardKpis: kpis }),

      resetToMockData: () => set({
        agents: mockAgents, clients: mockClients, leads: mockLeads,
        missions: mockMissions, opportunities: mockOpportunities,
        operationalItems: mockOperationalItems, sites: mockSites,
        sops: mockSops, timeEntries: mockTimeEntries,
      }),
    }),
    {
      name: 'proprely-store',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0 || version === 1) return persistedState as AppStore
        return persistedState as AppStore
      },
      onRehydrateStorage: () => () => {
        checkStorageSize()
      },
    }
  )
)
