'use client'

import { create } from 'zustand'
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry, MissionStatus, ServiceType
} from '@/types'
import * as db from '@/lib/db'

interface CompanySettings {
  id?: string
  name: string
  email: string
  phone: string
  address: string
  siret: string
}

const defaultCompanySettings: CompanySettings = {
  name: '',
  email: '',
  phone: '',
  address: '',
  siret: '',
}

interface HydrateData {
  agents?: Agent[]
  clients?: Client[]
  leads?: Lead[]
  missions?: Mission[]
  opportunities?: Opportunity[]
  operationalItems?: OperationalItem[]
  sites?: Site[]
  sops?: Sop[]
  timeEntries?: TimeEntry[]
  serviceTypes?: ServiceType[]
  companySettings?: Partial<CompanySettings>
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

  // Hydrate from Supabase
  hydrate: (data: HydrateData) => void

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
  winOpportunity: (id: string) => Promise<void>

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

  // Reset (kept for compatibility)
  resetToMockData: () => void
}


export const useAppStore = create<AppStore>()(
  (set, get) => ({
    agents: [],
    clients: [],
    leads: [],
    missions: [],
    opportunities: [],
    operationalItems: [],
    sites: [],
    sops: [],
    timeEntries: [],
    serviceTypes: [],
    companySettings: defaultCompanySettings,

    hydrate: (data) => set(s => ({
      agents: data.agents ?? s.agents,
      clients: data.clients ?? s.clients,
      leads: data.leads ?? s.leads,
      missions: data.missions ?? s.missions,
      opportunities: data.opportunities ?? s.opportunities,
      operationalItems: data.operationalItems ?? s.operationalItems,
      sites: data.sites ?? s.sites,
      sops: data.sops ?? s.sops,
      timeEntries: data.timeEntries ?? s.timeEntries,
      serviceTypes: data.serviceTypes ?? s.serviceTypes,
      companySettings: data.companySettings
        ? { ...s.companySettings, ...data.companySettings }
        : s.companySettings,
    })),

    // Agents
    addAgent: (agent) => {
      set(s => ({ agents: [...s.agents, agent] }))
      db.createAgent(agent).catch(console.error)
    },
    updateAgent: (id, data) => {
      set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...data } : a) }))
      db.updateAgent(id, data).catch(console.error)
    },
    deleteAgent: (id) => {
      set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
      db.deleteAgent(id).catch(console.error)
    },

    // Clients
    addClient: (client) => {
      set(s => ({ clients: [...s.clients, client] }))
      db.createClient_(client).catch(console.error)
    },
    updateClient: (id, data) => {
      set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }))
      db.updateClient_(id, data).catch(console.error)
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
      db.deleteClient_(id).catch(console.error)
    },

    // Sites
    addSite: (site) => {
      set(s => ({ sites: [...s.sites, site] }))
      db.createSite(site).catch(console.error)
    },
    updateSite: (id, data) => {
      set(s => ({ sites: s.sites.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
      db.updateSite(id, data).catch(console.error)
    },
    deleteSite: (id) => {
      set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) }))
      db.deleteSite(id).catch(console.error)
    },

    // Leads
    addLead: (lead) => {
      set(s => ({ leads: [...s.leads, lead] }))
      db.createLead(lead).catch(console.error)
    },
    updateLead: (id, data) => {
      set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l) }))
      db.updateLead(id, data).catch(console.error)
    },
    deleteLead: (id) => {
      set(s => ({ leads: s.leads.filter(l => l.id !== id) }))
      db.deleteLead(id).catch(console.error)
    },

    // Opportunities
    addOpportunity: (opp) => {
      set(s => ({ opportunities: [...s.opportunities, opp] }))
      db.createOpportunity(opp).catch(console.error)
    },
    updateOpportunity: (id, data) => {
      set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o) }))
      db.updateOpportunity(id, data).catch(console.error)
    },
    deleteOpportunity: (id) => {
      set(s => ({ opportunities: s.opportunities.filter(o => o.id !== id) }))
      db.deleteOpportunity(id).catch(console.error)
    },
    winOpportunity: async (id) => {
      const opp = get().opportunities.find(o => o.id === id)
      if (!opp || opp.converted_to_client) return

      const now = new Date().toISOString()

      // Optimistic update of opportunity stage
      set(s => ({
        opportunities: s.opportunities.map(o => o.id === id
          ? { ...o, stage: 'gagnee' as const, converted_to_client: true, converted_at: now }
          : o
        ),
      }))

      try {
        const { client, site, operationalItem } = await db.winOpportunity(id)
        set(s => ({
          opportunities: s.opportunities.map(o => o.id === id
            ? { ...o, client_id: client.id, site_id: site.id }
            : o
          ),
          clients: [...s.clients, client],
          sites: [...s.sites, site],
          operationalItems: [...s.operationalItems, operationalItem],
        }))
      } catch (err) {
        console.error('winOpportunity failed', err)
        // Revert optimistic update
        set(s => ({
          opportunities: s.opportunities.map(o => o.id === id
            ? { ...o, stage: opp.stage, converted_to_client: false, converted_at: null }
            : o
          ),
        }))
      }
    },

    // Missions
    addMission: (mission) => {
      set(s => ({ missions: [...s.missions, mission] }))
      db.createMission(mission).catch(console.error)
    },
    updateMission: (id, data) => {
      set(s => ({ missions: s.missions.map(m => m.id === id ? { ...m, ...data } : m) }))
      db.updateMission(id, data).catch(console.error)
    },
    deleteMission: (id) => {
      set(s => ({ missions: s.missions.filter(m => m.id !== id) }))
      db.deleteMission(id).catch(console.error)
    },
    updateMissionStatus: (id, status, validatedHours) => {
      const now = new Date().toISOString()
      set(s => ({
        missions: s.missions.map(m => m.id === id ? { ...m, status, updated_at: now } : m),
        timeEntries: validatedHours !== undefined
          ? s.timeEntries.map(te => te.mission_id === id
              ? { ...te, status: 'validee' as const, validated_hours: validatedHours, validated_at: now }
              : te
            )
          : s.timeEntries,
      }))
      db.updateMission(id, { status, updated_at: now }).catch(console.error)
      if (validatedHours !== undefined) {
        const entries = get().timeEntries.filter(te => te.mission_id === id)
        entries.forEach(te => {
          db.updateTimeEntry(te.id, { status: 'validee', validated_hours: validatedHours, validated_at: now }).catch(console.error)
        })
      }
    },

    // OperationalItems
    addOperationalItem: (item) => {
      set(s => ({ operationalItems: [...s.operationalItems, item] }))
      db.createOperationalItem(item).catch(console.error)
    },
    updateOperationalItem: (id, data) => {
      set(s => ({ operationalItems: s.operationalItems.map(i => i.id === id ? { ...i, ...data } : i) }))
      db.updateOperationalItem(id, data).catch(console.error)
    },
    deleteOperationalItem: (id) => {
      set(s => ({ operationalItems: s.operationalItems.filter(i => i.id !== id) }))
      db.deleteOperationalItem(id).catch(console.error)
    },

    // SOPs
    addSop: (sop) => {
      set(s => ({ sops: [...s.sops, sop] }))
      db.createSop(sop).catch(console.error)
    },
    updateSop: (id, data) => {
      set(s => ({ sops: s.sops.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
      db.updateSop(id, data).catch(console.error)
    },
    deleteSop: (id) => {
      set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) }))
      db.deleteSop(id).catch(console.error)
    },

    // TimeEntries
    addTimeEntry: (entry) => {
      set(s => ({ timeEntries: [...s.timeEntries, entry] }))
      db.createTimeEntry(entry).catch(console.error)
    },
    updateTimeEntry: (id, data) => {
      set(s => ({ timeEntries: s.timeEntries.map(te => te.id === id ? { ...te, ...data } : te) }))
      db.updateTimeEntry(id, data).catch(console.error)
    },

    // ServiceTypes
    addServiceType: (serviceType) => {
      set(s => ({ serviceTypes: [...s.serviceTypes, serviceType] }))
      db.createServiceType(serviceType).catch(console.error)
    },
    updateServiceType: (id, data) => {
      set(s => ({ serviceTypes: s.serviceTypes.map(st => st.id === id ? { ...st, ...data } : st) }))
      db.updateServiceType(id, data).catch(console.error)
    },
    deleteServiceType: (id) => {
      set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) }))
      db.deleteServiceType(id).catch(console.error)
    },

    // Company settings
    updateCompanySettings: (settings) => {
      set(s => ({ companySettings: { ...s.companySettings, ...settings } }))
      const state = get()
      if (state.companySettings.id) {
        db.updateCompany(state.companySettings.id, {
          name: settings.name ?? state.companySettings.name,
          email: settings.email ?? state.companySettings.email,
          phone: settings.phone ?? state.companySettings.phone,
          address: settings.address ?? state.companySettings.address,
        }).catch(console.error)
      }
    },

    resetToMockData: () => {
      // No-op in Supabase mode — kept for interface compatibility
      console.warn('resetToMockData is a no-op when using Supabase persistence')
    },
  })
)
