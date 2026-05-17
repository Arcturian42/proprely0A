'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry,
  MissionStatus, ServiceType,
} from '@/types'
import {
  mockAgents, mockClients, mockLeads, mockMissions, mockOpportunities,
  mockOperationalItems, mockSites, mockSops, mockTimeEntries,
} from '@/lib/mock-data'
import { DUMMY_COMPANY_1_ID, DUMMY_COMPANY_2_ID } from '@/lib/auth/dummy'
import { useCurrentCompanyId } from '@/lib/auth/hooks'
import { useMemo } from 'react'

interface CompanySettings {
  name: string
  email: string
  phone: string
  address: string
  siret: string
}

const defaultServiceTypes: ServiceType[] = [
  { id: 'st-1', company_id: DUMMY_COMPANY_1_ID, name: 'Nettoyage bureaux', estimated_duration_minutes: 120, indicative_price: 150, default_sop_id: 'sop-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-2', company_id: DUMMY_COMPANY_1_ID, name: 'Nettoyage médical', estimated_duration_minutes: 90, indicative_price: 120, default_sop_id: 'sop-2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-3', company_id: DUMMY_COMPANY_1_ID, name: 'Vitrerie', estimated_duration_minutes: 180, indicative_price: 200, default_sop_id: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-4', company_id: DUMMY_COMPANY_2_ID, name: 'Nettoyage hôtelier', estimated_duration_minutes: 30, indicative_price: 35, default_sop_id: 'sop-3', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

const defaultCompanySettings: Record<string, CompanySettings> = {
  [DUMMY_COMPANY_1_ID]: {
    name: 'Proprely Nettoyage Pro',
    email: 'contact@proprely.fr',
    phone: '01 23 45 67 89',
    address: '10 Rue de la Propreté, Paris',
    siret: '12345678901234',
  },
  [DUMMY_COMPANY_2_ID]: {
    name: 'ACME Cleaning',
    email: 'hello@acme.example',
    phone: '04 78 00 00 00',
    address: '15 Rue de la République, Lyon',
    siret: '98765432109876',
  },
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
  companySettings: Record<string, CompanySettings>

  addAgent: (agent: Agent) => void
  updateAgent: (id: string, data: Partial<Agent>) => void
  deleteAgent: (id: string) => void

  addClient: (client: Client) => void
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void

  addSite: (site: Site) => void
  updateSite: (id: string, data: Partial<Site>) => void
  deleteSite: (id: string) => void

  addLead: (lead: Lead) => void
  updateLead: (id: string, data: Partial<Lead>) => void
  deleteLead: (id: string) => void

  addOpportunity: (opp: Opportunity) => void
  updateOpportunity: (id: string, data: Partial<Opportunity>) => void
  deleteOpportunity: (id: string) => void
  winOpportunity: (id: string) => void

  addMission: (mission: Mission) => void
  updateMission: (id: string, data: Partial<Mission>) => void
  deleteMission: (id: string) => void
  updateMissionStatus: (id: string, status: MissionStatus, validatedHours?: number) => void

  addOperationalItem: (item: OperationalItem) => void
  updateOperationalItem: (id: string, data: Partial<OperationalItem>) => void
  deleteOperationalItem: (id: string) => void

  addSop: (sop: Sop) => void
  updateSop: (id: string, data: Partial<Sop>) => void
  deleteSop: (id: string) => void

  addTimeEntry: (entry: TimeEntry) => void
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => void

  addServiceType: (serviceType: ServiceType) => void
  updateServiceType: (id: string, data: Partial<ServiceType>) => void
  deleteServiceType: (id: string) => void

  updateCompanySettings: (companyId: string, settings: Partial<CompanySettings>) => void
  getCompanySettings: (companyId: string) => CompanySettings

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

      addAgent: (agent) => set(s => ({ agents: [...s.agents, agent] })),
      updateAgent: (id, data) => set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...data } : a) })),
      deleteAgent: (id) => set(s => ({ agents: s.agents.filter(a => a.id !== id) })),

      addClient: (client) => set(s => ({ clients: [...s.clients, client] })),
      updateClient: (id, data) => set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) })),
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

      addSite: (site) => set(s => ({ sites: [...s.sites, site] })),
      updateSite: (id, data) => set(s => ({ sites: s.sites.map(s2 => s2.id === id ? { ...s2, ...data } : s2) })),
      deleteSite: (id) => set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) })),

      addLead: (lead) => set(s => ({ leads: [...s.leads, lead] })),
      updateLead: (id, data) => set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l) })),
      deleteLead: (id) => set(s => ({ leads: s.leads.filter(l => l.id !== id) })),

      addOpportunity: (opp) => set(s => ({ opportunities: [...s.opportunities, opp] })),
      updateOpportunity: (id, data) => set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o) })),
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
          id: clientId, company_id: opp.company_id,
          name: opp.prospect_name, contact_name: opp.contact_name,
          email: opp.email, phone: opp.phone,
          billing_address: opp.site_address, city: opp.city,
          client_type: opp.client_type, status: 'actif', notes: opp.notes,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newSite: Site = {
          id: siteId, company_id: opp.company_id, client_id: clientId,
          name: `Site ${opp.prospect_name}`,
          address: opp.site_address, city: opp.city,
          service_type: opp.service_type,
          surface_area: null, access_code: null, access_instructions: null,
          frequency: null, sop_id: null, notes: null,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newItem: OperationalItem = {
          id: itemId, company_id: opp.company_id,
          client_id: clientId, site_id: siteId,
          opportunity_id: opp.id,
          source: 'pipeline',
          title: `${opp.prospect_name} — à organiser`,
          status: 'a_organiser', priority: 'normale',
          notes: null, converted_to_mission: false, mission_id: null,
          created_at: now, updated_at: now,
          client: newClient, site: newSite,
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

      addMission: (mission) => set(s => ({ missions: [...s.missions, mission] })),
      updateMission: (id, data) => set(s => ({ missions: s.missions.map(m => m.id === id ? { ...m, ...data } : m) })),
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

      addOperationalItem: (item) => set(s => ({ operationalItems: [...s.operationalItems, item] })),
      updateOperationalItem: (id, data) => set(s => ({ operationalItems: s.operationalItems.map(i => i.id === id ? { ...i, ...data } : i) })),
      deleteOperationalItem: (id) => set(s => ({ operationalItems: s.operationalItems.filter(i => i.id !== id) })),

      addSop: (sop) => set(s => ({ sops: [...s.sops, sop] })),
      updateSop: (id, data) => set(s => ({ sops: s.sops.map(s2 => s2.id === id ? { ...s2, ...data } : s2) })),
      deleteSop: (id) => set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) })),

      addTimeEntry: (entry) => set(s => ({ timeEntries: [...s.timeEntries, entry] })),
      updateTimeEntry: (id, data) => set(s => ({ timeEntries: s.timeEntries.map(te => te.id === id ? { ...te, ...data } : te) })),

      addServiceType: (serviceType) => set(s => ({ serviceTypes: [...s.serviceTypes, serviceType] })),
      updateServiceType: (id, data) => set(s => ({ serviceTypes: s.serviceTypes.map(st => st.id === id ? { ...st, ...data } : st) })),
      deleteServiceType: (id) => set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) })),

      updateCompanySettings: (companyId, settings) => set(s => ({
        companySettings: {
          ...s.companySettings,
          [companyId]: { ...(s.companySettings[companyId] ?? defaultCompanySettings[companyId] ?? defaultCompanySettings[DUMMY_COMPANY_1_ID]), ...settings },
        },
      })),
      getCompanySettings: (companyId) =>
        get().companySettings[companyId] ?? defaultCompanySettings[companyId] ?? defaultCompanySettings[DUMMY_COMPANY_1_ID],

      resetToMockData: () => set({
        agents: mockAgents, clients: mockClients, leads: mockLeads,
        missions: mockMissions, opportunities: mockOpportunities,
        operationalItems: mockOperationalItems, sites: mockSites,
        sops: mockSops, timeEntries: mockTimeEntries,
        serviceTypes: defaultServiceTypes,
        companySettings: defaultCompanySettings,
      }),
    }),
    {
      name: 'proprely-store',
      // Bumped from v0 → v2 after multi-tenant refactor.
      // Older persisted state has only company-1 → throw it away cleanly.
      version: 2,
      migrate: () => ({
        agents: mockAgents, clients: mockClients, leads: mockLeads,
        missions: mockMissions, opportunities: mockOpportunities,
        operationalItems: mockOperationalItems, sites: mockSites,
        sops: mockSops, timeEntries: mockTimeEntries,
        serviceTypes: defaultServiceTypes,
        companySettings: defaultCompanySettings,
      } as Partial<AppStore> as AppStore),
    }
  )
)

// ─── Tenant-scoped selectors ─────────────────────────────────────────────────
// All UI reads must go through these so a CompanySwitcher swap is enough to
// re-scope every page. Direct useAppStore(s => s.agents) is now a smell.

function byCompany<T extends { company_id: string }>(rows: T[], companyId: string): T[] {
  return rows.filter(r => r.company_id === companyId)
}

export function useCompanyAgents() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.agents)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyClients() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.clients)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanySites() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.sites)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyLeads() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.leads)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyOpportunities() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.opportunities)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyMissions() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.missions)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyOperationalItems() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.operationalItems)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanySops() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.sops)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyTimeEntries() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.timeEntries)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanyServiceTypes() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.serviceTypes)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}

export function useCompanySettings() {
  const companyId = useCurrentCompanyId()
  const all = useAppStore(s => s.companySettings)
  return all[companyId] ?? defaultCompanySettings[companyId] ?? defaultCompanySettings[DUMMY_COMPANY_1_ID]
}
