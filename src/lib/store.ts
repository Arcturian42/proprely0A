'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { useCurrentCompanyId } from '@/lib/auth'
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry, MissionStatus, ServiceType, Quote, OpportunityStage,
  AgentSkill, AgentCertification, AvailabilityBlock, FatigueScore, ClientConstraint, SchedulingProposal,
  OperationalMissionStatus,
} from '@/types'
import { LEGACY_TO_OPERATIONAL, OPERATIONAL_TO_LEGACY } from '@/lib/constants'
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
  logo_url?: string
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
  quotes: Quote[]
  companySettings: CompanySettings
  // Nouvelles entités opérationnelles
  agentSkills: AgentSkill[]
  agentCertifications: AgentCertification[]
  availabilityBlocks: AvailabilityBlock[]
  fatigueScores: FatigueScore[]
  clientConstraints: ClientConstraint[]
  schedulingProposals: SchedulingProposal[]

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
  moveOpportunity: (id: string, stage: OpportunityStage) => void

  // Missions
  addMission: (mission: Mission) => void
  updateMission: (id: string, data: Partial<Mission>) => void
  deleteMission: (id: string) => void
  updateMissionStatus: (id: string, status: MissionStatus, validatedHours?: number) => void
  updateMissionOperationalStatus: (id: string, status: OperationalMissionStatus) => void
  assignAgentsToMission: (missionId: string, agentIds: string[]) => void
  signOpportunityContract: (opportunityId: string) => string | null // returns new mission id

  // Agent skills / certs / availability
  setAgentSkills: (agentId: string, skills: Omit<AgentSkill, 'id' | 'agent_id'>[]) => void
  setAgentCertifications: (agentId: string, certs: Omit<AgentCertification, 'id' | 'agent_id'>[]) => void
  addAvailabilityBlock: (block: Omit<AvailabilityBlock, 'id'>) => void
  removeAvailabilityBlock: (id: string) => void
  upsertClientConstraint: (siteId: string, data: Omit<ClientConstraint, 'id' | 'site_id'>) => void
  setSchedulingProposals: (missionId: string, proposals: SchedulingProposal[]) => void
  selectSchedulingProposal: (missionId: string, proposalId: string) => void

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

  // Quotes
  addQuote: (quote: Quote) => void
  updateQuote: (id: string, data: Partial<Quote>) => void
  deleteQuote: (id: string) => void
  sendQuote: (quoteId: string) => void
  signQuote: (quoteId: string) => void

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
      quotes: [],
      companySettings: defaultCompanySettings,
      agentSkills: [
        { id: 'sk-1', agent_id: 'agent-1', skill: 'bureaux', level: 'expert' },
        { id: 'sk-2', agent_id: 'agent-1', skill: 'vitres', level: 'intermediaire' },
        { id: 'sk-3', agent_id: 'agent-1', skill: 'desinfection', level: 'intermediaire' },
        { id: 'sk-4', agent_id: 'agent-2', skill: 'vitres', level: 'expert' },
        { id: 'sk-5', agent_id: 'agent-2', skill: 'sols_mecanises', level: 'intermediaire' },
        { id: 'sk-6', agent_id: 'agent-2', skill: 'parking', level: 'intermediaire' },
        { id: 'sk-7', agent_id: 'agent-3', skill: 'medical', level: 'expert' },
        { id: 'sk-8', agent_id: 'agent-3', skill: 'desinfection', level: 'expert' },
        { id: 'sk-9', agent_id: 'agent-3', skill: 'bureaux', level: 'debutant' },
      ],
      agentCertifications: [
        { id: 'c-1', agent_id: 'agent-2', name: 'CACES R489', category: 'machine', issued_at: '2024-06-01', expires_at: '2029-06-01' },
        { id: 'c-2', agent_id: 'agent-2', name: 'Permis B', category: 'permis', issued_at: '2018-03-15', expires_at: null },
        { id: 'c-3', agent_id: 'agent-3', name: 'Manipulation produits chimiques', category: 'chimie', issued_at: '2025-01-10', expires_at: '2027-01-10' },
      ],
      availabilityBlocks: [
        { id: 'ab-1', agent_id: 'agent-1', start_at: new Date(Date.now() + 14 * 86400000).toISOString(), end_at: new Date(Date.now() + 21 * 86400000).toISOString(), kind: 'vacances', notes: 'Congés annuels' },
      ],
      fatigueScores: [],
      clientConstraints: [],
      schedulingProposals: [],

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
        const deletedSiteIds = new Set(s.sites.filter(si => si.client_id === id).map(si => si.id))
        const deletedMissionIds = new Set(
          s.missions.filter(m => m.client_id === id).map(m => m.id)
        )
        return {
          clients: s.clients.filter(c => c.id !== id),
          sites: s.sites.filter(si => si.client_id !== id),
          missions: s.missions.filter(m => !deletedMissionIds.has(m.id)),
          timeEntries: s.timeEntries.filter(te => !deletedMissionIds.has(te.mission_id)),
          opportunities: s.opportunities.map(o =>
            o.client_id === id ? { ...o, client_id: null, site_id: null } : o
          ),
          operationalItems: s.operationalItems.filter(
            i => i.client_id !== id && !deletedSiteIds.has(i.site_id ?? '')
          ),
          leads: s.leads.map(l =>
            l.converted_opportunity_id && s.opportunities.find(
              o => o.id === l.converted_opportunity_id && o.client_id === id
            )
              ? { ...l, converted_opportunity_id: null, status: 'qualifie' }
              : l
          ),
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
      moveOpportunity: (id, stage) => {
        const now = new Date().toISOString()
        set(s => ({
          opportunities: s.opportunities.map(o =>
            o.id === id ? { ...o, stage, updated_at: now } : o
          )
        }))
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
            ? { ...o, stage: 'gagne', converted_to_client: true, converted_at: now, client_id: clientId, site_id: siteId }
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
        const sanitizedHours = validatedHours !== undefined
          ? Math.max(0, Math.min(24, Number.isFinite(validatedHours) ? validatedHours : 0))
          : undefined
        set(s => ({
          missions: s.missions.map(m => m.id === id ? {
            ...m,
            status,
            operational_status: (LEGACY_TO_OPERATIONAL[status] ?? m.operational_status ?? 'planifie') as OperationalMissionStatus,
            updated_at: now,
          } : m),
          timeEntries: sanitizedHours !== undefined
            ? s.timeEntries.map(te => te.mission_id === id
                ? {
                    ...te,
                    status: 'validee',
                    validated_hours: sanitizedHours,
                    total_cost: te.hourly_cost != null ? sanitizedHours * te.hourly_cost : te.total_cost,
                    validated_at: now,
                    updated_at: now,
                  }
                : te
              )
            : s.timeEntries,
        }))
      },
      updateMissionOperationalStatus: (id, operational_status) => {
        const now = new Date().toISOString()
        const legacy = (OPERATIONAL_TO_LEGACY[operational_status] ?? 'prevue') as MissionStatus
        set(s => ({
          missions: s.missions.map(m => m.id === id ? {
            ...m,
            operational_status,
            status: legacy,
            updated_at: now,
          } : m),
        }))
      },
      assignAgentsToMission: (missionId, agentIds) => {
        const state = get()
        const assignedAgents = state.agents.filter(a => agentIds.includes(a.id))
        set(s => ({
          missions: s.missions.map(m => m.id === missionId ? { ...m, agents: assignedAgents, updated_at: new Date().toISOString() } : m),
        }))
      },
      signOpportunityContract: (opportunityId) => {
        const state = get()
        const opp = state.opportunities.find(o => o.id === opportunityId)
        if (!opp) return null
        const now = new Date().toISOString()

        // Réutilise ou crée client
        let clientId = opp.client_id
        let client = clientId ? state.clients.find(c => c.id === clientId) : undefined
        if (!client) {
          clientId = crypto.randomUUID()
          client = {
            id: clientId, company_id: 'company-1',
            name: opp.prospect_name, contact_name: opp.contact_name,
            email: opp.email, phone: opp.phone,
            billing_address: opp.site_address, city: opp.city,
            client_type: opp.client_type, status: 'actif', notes: opp.notes,
            created_from_opportunity_id: opp.id,
            created_at: now, updated_at: now,
          }
        }

        // Réutilise ou crée site
        let siteId = opp.site_id
        let site = siteId ? state.sites.find(s => s.id === siteId) : undefined
        if (!site) {
          siteId = crypto.randomUUID()
          site = {
            id: siteId, company_id: 'company-1', client_id: clientId!,
            name: `Site ${opp.prospect_name}`,
            address: opp.site_address, city: opp.city,
            service_type: opp.service_type,
            surface_area: null, access_code: null, access_instructions: null,
            frequency: null, sop_id: null, notes: null,
            created_from_opportunity_id: opp.id,
            created_at: now, updated_at: now,
          }
        }

        // Crée la mission draft
        const missionId = crypto.randomUUID()
        const newMission: Mission = {
          id: missionId,
          company_id: 'company-1',
          client_id: clientId!,
          site_id: siteId!,
          operational_item_id: null,
          service_type: opp.service_type,
          sop_id: null,
          status: 'prevue',
          operational_status: 'a_organiser',
          scheduled_date: new Date().toISOString().slice(0, 10),
          start_time: null,
          planned_hours: 3,
          notes: opp.notes,
          priority: 'normale',
          urgency: 'normale',
          recurrence: 'ponctuelle',
          estimated_workers: 1,
          estimated_profitability: opp.estimated_amount,
          required_machines: [],
          consumables: [],
          equipment: [],
          required_skills: [],
          parking_notes: null,
          floor_count: null,
          organization_step: 0,
          contact_name: opp.contact_name,
          contact_phone: opp.phone,
          created_at: now,
          updated_at: now,
          client,
          site,
          agents: [],
        }

        set(s => ({
          opportunities: s.opportunities.map(o => o.id === opportunityId
            ? { ...o, stage: 'gagne', converted_to_client: true, converted_at: now, client_id: clientId!, site_id: siteId! }
            : o
          ),
          clients: s.clients.find(c => c.id === clientId) ? s.clients : [...s.clients, client!],
          sites: s.sites.find(si => si.id === siteId) ? s.sites : [...s.sites, site!],
          missions: [...s.missions, newMission],
        }))
        return missionId
      },

      // Agent skills / certs / availability
      setAgentSkills: (agentId, skills) => set(s => ({
        agentSkills: [
          ...s.agentSkills.filter(sk => sk.agent_id !== agentId),
          ...skills.map(sk => ({ ...sk, id: crypto.randomUUID(), agent_id: agentId })),
        ],
      })),
      setAgentCertifications: (agentId, certs) => set(s => ({
        agentCertifications: [
          ...s.agentCertifications.filter(c => c.agent_id !== agentId),
          ...certs.map(c => ({ ...c, id: crypto.randomUUID(), agent_id: agentId })),
        ],
      })),
      addAvailabilityBlock: (block) => set(s => ({
        availabilityBlocks: [...s.availabilityBlocks, { ...block, id: crypto.randomUUID() }],
      })),
      removeAvailabilityBlock: (id) => set(s => ({
        availabilityBlocks: s.availabilityBlocks.filter(b => b.id !== id),
      })),
      upsertClientConstraint: (siteId, data) => set(s => {
        const existing = s.clientConstraints.find(c => c.site_id === siteId)
        if (existing) {
          return {
            clientConstraints: s.clientConstraints.map(c => c.site_id === siteId ? { ...c, ...data } : c),
          }
        }
        return {
          clientConstraints: [...s.clientConstraints, { ...data, id: crypto.randomUUID(), site_id: siteId }],
        }
      }),
      setSchedulingProposals: (missionId, proposals) => set(s => ({
        schedulingProposals: [
          ...s.schedulingProposals.filter(p => p.mission_id !== missionId),
          ...proposals,
        ],
      })),
      selectSchedulingProposal: (missionId, proposalId) => set(s => ({
        schedulingProposals: s.schedulingProposals.map(p => p.mission_id === missionId
          ? { ...p, selected: p.id === proposalId }
          : p
        ),
      })),

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

      // Quotes
      addQuote: (quote) => set(s => ({ quotes: [...s.quotes, quote] })),
      updateQuote: (id, data) => set(s => ({
        quotes: s.quotes.map(q => q.id === id ? { ...q, ...data } : q)
      })),
      deleteQuote: (id) => set(s => ({ quotes: s.quotes.filter(q => q.id !== id) })),
      sendQuote: (quoteId) => {
        const state = get()
        const quote = state.quotes.find(q => q.id === quoteId)
        if (!quote) return
        const now = new Date().toISOString()
        // Update quote to sent
        set(s => ({
          quotes: s.quotes.map(q => q.id === quoteId ? { ...q, status: 'envoye', updated_at: now } : q),
          // Auto-move opportunity to proposition
          opportunities: s.opportunities.map(o =>
            o.id === quote.opportunity_id ? { ...o, stage: 'proposition', updated_at: now } : o
          ),
        }))
      },
      signQuote: (quoteId) => {
        const state = get()
        const quote = state.quotes.find(q => q.id === quoteId)
        if (!quote) return
        const now = new Date().toISOString()

        const opp = state.opportunities.find(o => o.id === quote.opportunity_id)

        set(s => ({
          quotes: s.quotes.map(q =>
            q.id === quoteId ? { ...q, status: 'signe', signed_at: now, updated_at: now } : q
          ),
          opportunities: s.opportunities.map(o =>
            o.id === quote.opportunity_id ? { ...o, stage: 'gagne', updated_at: now } : o
          ),
        }))

        // If opportunity not yet converted, trigger winOpportunity logic
        if (opp && !opp.converted_to_client) {
          get().winOpportunity(quote.opportunity_id)
        }
      },

      // Company settings
      updateCompanySettings: (settings) => set(s => ({ companySettings: { ...s.companySettings, ...settings } })),

      resetToMockData: () => set({
        agents: mockAgents, clients: mockClients, leads: mockLeads,
        missions: mockMissions, opportunities: mockOpportunities,
        operationalItems: mockOperationalItems, sites: mockSites,
        sops: mockSops, timeEntries: mockTimeEntries,
        quotes: [],
      }),
    }),
    {
      name: 'proprely-store',
      version: 2, // bump pour invalider les caches localStorage antérieurs à la refonte cockpit
    }
  )
)

// Company-scoped selectors — multi-tenant ready, opt-in. Pages qui n'ont pas
// encore migré continuent d'utiliser les getters bruts (les données mock sont
// toutes sur DUMMY_COMPANY_1_ID donc rien ne casse).
function byCompany<T extends { company_id?: string | null }>(rows: T[], companyId: string): T[] {
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

export function useCompanyQuotes() {
  const companyId = useCurrentCompanyId()
  const rows = useAppStore(s => s.quotes)
  return useMemo(() => byCompany(rows, companyId), [rows, companyId])
}
