'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useCurrentCompanyId } from '@/lib/auth'
import { isSupabaseClient } from '@/lib/supabase/client-config'
import { toUserMessage } from '@/lib/errors/user-message'
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
import type { CompanyDataSnapshot } from '@/app/actions/data'
import {
  upsertAgent as _upsertAgent, deleteAgent as _deleteAgent,
  upsertClient as _upsertClient, deleteClient as _deleteClient,
  upsertSite as _upsertSite, deleteSite as _deleteSite,
  upsertLead as _upsertLead, deleteLead as _deleteLead,
  upsertOpportunity as _upsertOpportunity, deleteOpportunity as _deleteOpportunity,
  upsertMission as _upsertMission, deleteMission as _deleteMission,
  assignAgentsToMission as _assignAgentsToMission,
  upsertTimeEntry as _upsertTimeEntry,
  upsertSop as _upsertSop, deleteSop as _deleteSop,
  upsertServiceType as _upsertServiceType, deleteServiceType as _deleteServiceType,
  upsertQuote as _upsertQuote, deleteQuote as _deleteQuote,
  upsertOperationalItem as _upsertOperationalItem, deleteOperationalItem as _deleteOperationalItem,
  type WriteResult,
} from '@/app/actions/data'

/**
 * Fire-and-forget bridge to Supabase server actions. We update the store
 * synchronously for UX, then mirror the change to the DB in background.
 * On failure we toast — the next page navigation will refetch and reconcile.
 *
 * No-op in dummy mode (no NEXT_PUBLIC_SUPABASE_URL set).
 */
function syncToSupabase(label: string, action: () => Promise<WriteResult>): void {
  if (!isSupabaseClient()) return
  void action().then(r => {
    if (!r.ok) {
      const fallback = `Sauvegarde ${label} échouée. Réessaie ou recharge la page.`
      toast.error(toUserMessage(r.error, fallback))
    }
  }).catch(err => {
    const fallback = `Sauvegarde ${label} échouée — erreur réseau.`
    toast.error(toUserMessage(err, fallback))
  })
}

const defaultServiceTypes: ServiceType[] = [
  { id: 'st-1', company_id: 'company-1', name: 'Nettoyage bureaux', description: null, estimated_duration_minutes: 120, indicative_price: 150, default_sop_id: 'sop-1', is_default: true, is_active: true, sort_order: 10, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-2', company_id: 'company-1', name: 'Nettoyage médical', description: null, estimated_duration_minutes: 90, indicative_price: 120, default_sop_id: 'sop-2', is_default: true, is_active: true, sort_order: 20, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'st-3', company_id: 'company-1', name: 'Vitrerie', description: null, estimated_duration_minutes: 180, indicative_price: 200, default_sop_id: null, is_default: true, is_active: true, sort_order: 30, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

interface CompanySettings {
  name: string
  email: string
  phone: string
  address: string
  siret: string
  logo_url?: string
  // Mirror of company_pricing_settings.hourly_labor_cost. Lives here (not in a
  // separate slice) so time-entry totals + KPI calculations don't have to
  // cross-store. Null when the company hasn't completed onboarding step 4.
  hourly_labor_cost?: number | null
}

const defaultCompanySettings: CompanySettings = {
  name: 'Proprely Nettoyage Pro',
  email: 'contact@proprely.fr',
  phone: '01 23 45 67 89',
  address: '10 Rue de la Propreté, Paris',
  siret: '12345678901234',
  hourly_labor_cost: null,
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

  // Hydration from Supabase — replaces all tenant-scoped arrays with a fresh
  // snapshot from the DB. Called by SupabaseHydrator at mount and after writes.
  hydrateCompanyData: (data: CompanyDataSnapshot) => void
}


// En dummy mode (Supabase non configuré) on démarre avec les mocks pour pouvoir
// développer/démo sans backend. En mode réel, on part vide et SupabaseHydrator
// remplace tout au mount via hydrateCompanyData() — sinon le user verrait
// les données mock flasher pendant la fetch initiale.
const useMocks = !isSupabaseClient()

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      agents: useMocks ? mockAgents : [],
      clients: useMocks ? mockClients : [],
      leads: useMocks ? mockLeads : [],
      missions: useMocks ? mockMissions : [],
      opportunities: useMocks ? mockOpportunities : [],
      operationalItems: useMocks ? mockOperationalItems : [],
      sites: useMocks ? mockSites : [],
      sops: useMocks ? mockSops : [],
      timeEntries: useMocks ? mockTimeEntries : [],
      serviceTypes: useMocks ? defaultServiceTypes : [],
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
      addAgent: (agent) => {
        set(s => ({ agents: [...s.agents, agent] }))
        syncToSupabase('agent', () => _upsertAgent(agent))
      },
      updateAgent: (id, data) => {
        const next = get().agents.find(a => a.id === id)
        set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...data } : a) }))
        if (next) syncToSupabase('agent', () => _upsertAgent({ ...next, ...data }))
      },
      deleteAgent: (id) => {
        set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
        syncToSupabase('agent', () => _deleteAgent(id))
      },

      // Clients
      addClient: (client) => {
        set(s => ({ clients: [...s.clients, client] }))
        syncToSupabase('client', () => _upsertClient(client))
      },
      updateClient: (id, data) => {
        const next = get().clients.find(c => c.id === id)
        set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }))
        if (next) syncToSupabase('client', () => _upsertClient({ ...next, ...data }))
      },
      deleteClient: (id) => {
        // Cascade locale : on miroirise ce que la DB fera via ON DELETE CASCADE
        // (sites + missions via FK, leads/opportunities ré-affectés en local).
        set(s => {
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
        })
        syncToSupabase('client', () => _deleteClient(id))
      },

      // Sites
      addSite: (site) => {
        set(s => ({ sites: [...s.sites, site] }))
        syncToSupabase('site', () => _upsertSite(site))
      },
      updateSite: (id, data) => {
        const next = get().sites.find(s2 => s2.id === id)
        set(s => ({ sites: s.sites.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
        if (next) syncToSupabase('site', () => _upsertSite({ ...next, ...data }))
      },
      deleteSite: (id) => {
        set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) }))
        syncToSupabase('site', () => _deleteSite(id))
      },

      // Leads
      addLead: (lead) => {
        set(s => ({ leads: [...s.leads, lead] }))
        syncToSupabase('lead', () => _upsertLead(lead))
      },
      updateLead: (id, data) => {
        const next = get().leads.find(l => l.id === id)
        set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l) }))
        if (next) syncToSupabase('lead', () => _upsertLead({ ...next, ...data }))
      },
      deleteLead: (id) => {
        set(s => ({ leads: s.leads.filter(l => l.id !== id) }))
        syncToSupabase('lead', () => _deleteLead(id))
      },

      // Opportunities
      addOpportunity: (opp) => {
        set(s => ({ opportunities: [...s.opportunities, opp] }))
        syncToSupabase('opportunité', () => _upsertOpportunity(opp))
      },
      updateOpportunity: (id, data) => {
        const next = get().opportunities.find(o => o.id === id)
        set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o) }))
        if (next) syncToSupabase('opportunité', () => _upsertOpportunity({ ...next, ...data }))
      },
      deleteOpportunity: (id) => {
        set(s => ({ opportunities: s.opportunities.filter(o => o.id !== id) }))
        syncToSupabase('opportunité', () => _deleteOpportunity(id))
      },
      moveOpportunity: (id, stage) => {
        const now = new Date().toISOString()
        const next = get().opportunities.find(o => o.id === id)
        set(s => ({
          opportunities: s.opportunities.map(o =>
            o.id === id ? { ...o, stage, updated_at: now } : o
          )
        }))
        if (next) syncToSupabase('opportunité', () => _upsertOpportunity({ ...next, stage, updated_at: now }))
      },
      winOpportunity: (id) => {
        const state = get()
        const opp = state.opportunities.find(o => o.id === id)
        if (!opp || opp.converted_to_client) return

        const clientId = crypto.randomUUID()
        const siteId = crypto.randomUUID()
        const itemId = crypto.randomUUID()
        const now = new Date().toISOString()
        const companyId = opp.company_id

        const newClient: Client = {
          id: clientId, company_id: companyId,
          name: opp.prospect_name, contact_name: opp.contact_name,
          email: opp.email, phone: opp.phone,
          billing_address: opp.site_address, city: opp.city,
          client_type: opp.client_type, status: 'actif', notes: opp.notes,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newSite: Site = {
          id: siteId, company_id: companyId, client_id: clientId,
          name: `Site ${opp.prospect_name}`,
          address: opp.site_address, city: opp.city,
          service_type: opp.service_type,
          surface_area: null, access_code: null, access_instructions: null,
          frequency: null, sop_id: null, notes: null,
          created_from_opportunity_id: opp.id,
          created_at: now, updated_at: now,
        }
        const newItem: OperationalItem = {
          id: itemId, company_id: companyId,
          client_id: clientId, site_id: siteId,
          opportunity_id: opp.id,
          source: 'pipeline',
          title: `${opp.prospect_name} — à organiser`,
          status: 'a_organiser', priority: 'normal',
          notes: null, converted_to_mission: false, mission_id: null,
          created_at: now, updated_at: now,
        }
        const updatedOpp: Opportunity = {
          ...opp, stage: 'gagne', converted_to_client: true, converted_at: now,
          client_id: clientId, site_id: siteId,
        }

        set(s => ({
          opportunities: s.opportunities.map(o => o.id === id ? updatedOpp : o),
          clients: [...s.clients, newClient],
          sites: [...s.sites, newSite],
          operationalItems: [...s.operationalItems, newItem],
        }))
        // Ordre : client → site (FK client) → item (FK client+site) → opportunity update.
        syncToSupabase('client', () => _upsertClient(newClient))
        syncToSupabase('site', () => _upsertSite(newSite))
        syncToSupabase('item opérationnel', () => _upsertOperationalItem(newItem))
        syncToSupabase('opportunité', () => _upsertOpportunity(updatedOpp))
      },

      // Missions
      addMission: (mission) => {
        set(s => ({ missions: [...s.missions, mission] }))
        syncToSupabase('mission', () => _upsertMission(mission))
      },
      updateMission: (id, data) => {
        const next = get().missions.find(m => m.id === id)
        set(s => ({ missions: s.missions.map(m => m.id === id ? { ...m, ...data } : m) }))
        if (next) syncToSupabase('mission', () => _upsertMission({ ...next, ...data }))
      },
      deleteMission: (id) => {
        set(s => ({ missions: s.missions.filter(m => m.id !== id) }))
        syncToSupabase('mission', () => _deleteMission(id))
      },
      updateMissionStatus: (id, status, validatedHours) => {
        const now = new Date().toISOString()
        const sanitizedHours = validatedHours !== undefined
          ? Math.max(0, Math.min(24, Number.isFinite(validatedHours) ? validatedHours : 0))
          : undefined
        const before = get()
        const updatedMission = before.missions.find(m => m.id === id)
        set(s => ({
          missions: s.missions.map(m => m.id === id ? {
            ...m,
            status,
            operational_status: (LEGACY_TO_OPERATIONAL[status] ?? m.operational_status ?? 'planifie') as OperationalMissionStatus,
            updated_at: now,
          } : m),
          timeEntries: sanitizedHours !== undefined
            ? s.timeEntries.map(te => {
                if (te.mission_id !== id) return te
                // BUG-MAJ-05 — total_cost must reflect the validated hours.
                // Use the time-entry's own hourly_cost first (covers agents
                // with negotiated rates), then fall back to the company
                // default. Final 0 fallback only triggers if neither is
                // configured — surfaces as €0 in P&L reports rather than
                // silently keeping a stale total_cost from creation time.
                const hourly = te.hourly_cost
                  ?? s.companySettings?.hourly_labor_cost
                  ?? 0
                return {
                  ...te,
                  status: 'validee',
                  validated_hours: sanitizedHours,
                  total_cost: sanitizedHours * hourly,
                  validated_at: now,
                  updated_at: now,
                }
              })
            : s.timeEntries,
        }))
        if (updatedMission) {
          syncToSupabase('mission', () => _upsertMission({
            ...updatedMission, status,
            operational_status: (LEGACY_TO_OPERATIONAL[status] ?? updatedMission.operational_status ?? 'planifie') as OperationalMissionStatus,
            updated_at: now,
          }))
          // Mirror sanitized time entries too.
          if (sanitizedHours !== undefined) {
            get().timeEntries
              .filter(te => te.mission_id === id)
              .forEach(te => syncToSupabase('heures', () => _upsertTimeEntry(te)))
          }
        }
      },
      updateMissionOperationalStatus: (id, operational_status) => {
        const now = new Date().toISOString()
        const legacy = (OPERATIONAL_TO_LEGACY[operational_status] ?? 'prevue') as MissionStatus
        const before = get().missions.find(m => m.id === id)
        set(s => ({
          missions: s.missions.map(m => m.id === id ? {
            ...m,
            operational_status,
            status: legacy,
            updated_at: now,
          } : m),
        }))
        if (before) {
          syncToSupabase('mission', () => _upsertMission({ ...before, operational_status, status: legacy, updated_at: now }))
        }
      },
      assignAgentsToMission: (missionId, agentIds) => {
        const state = get()
        const assignedAgents = state.agents.filter(a => agentIds.includes(a.id))
        set(s => ({
          missions: s.missions.map(m => m.id === missionId ? { ...m, agents: assignedAgents, updated_at: new Date().toISOString() } : m),
        }))
        syncToSupabase('affectation', () => _assignAgentsToMission(missionId, agentIds))
      },
      signOpportunityContract: (opportunityId) => {
        const state = get()
        const opp = state.opportunities.find(o => o.id === opportunityId)
        if (!opp) return null
        const now = new Date().toISOString()
        const companyId = opp.company_id

        // Réutilise ou crée client
        let clientId = opp.client_id
        let client = clientId ? state.clients.find(c => c.id === clientId) : undefined
        const isNewClient = !client
        if (!client) {
          clientId = crypto.randomUUID()
          client = {
            id: clientId, company_id: companyId,
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
        const isNewSite = !site
        if (!site) {
          siteId = crypto.randomUUID()
          site = {
            id: siteId, company_id: companyId, client_id: clientId!,
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
          company_id: companyId,
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
        const updatedOpp: Opportunity = {
          ...opp, stage: 'gagne', converted_to_client: true, converted_at: now,
          client_id: clientId!, site_id: siteId!,
        }

        set(s => ({
          opportunities: s.opportunities.map(o => o.id === opportunityId ? updatedOpp : o),
          clients: s.clients.find(c => c.id === clientId) ? s.clients : [...s.clients, client!],
          sites: s.sites.find(si => si.id === siteId) ? s.sites : [...s.sites, site!],
          missions: [...s.missions, newMission],
        }))
        // Persist : client (si nouveau) → site (si nouveau) → mission → opportunity.
        if (isNewClient && client) syncToSupabase('client', () => _upsertClient(client!))
        if (isNewSite && site) syncToSupabase('site', () => _upsertSite(site!))
        syncToSupabase('mission', () => _upsertMission(newMission))
        syncToSupabase('opportunité', () => _upsertOpportunity(updatedOpp))
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
      addOperationalItem: (item) => {
        set(s => ({ operationalItems: [...s.operationalItems, item] }))
        syncToSupabase('item opérationnel', () => _upsertOperationalItem(item))
      },
      updateOperationalItem: (id, data) => {
        const next = get().operationalItems.find(i => i.id === id)
        set(s => ({ operationalItems: s.operationalItems.map(i => i.id === id ? { ...i, ...data } : i) }))
        if (next) syncToSupabase('item opérationnel', () => _upsertOperationalItem({ ...next, ...data }))
      },
      deleteOperationalItem: (id) => {
        set(s => ({ operationalItems: s.operationalItems.filter(i => i.id !== id) }))
        syncToSupabase('item opérationnel', () => _deleteOperationalItem(id))
      },

      // SOPs
      addSop: (sop) => {
        set(s => ({ sops: [...s.sops, sop] }))
        syncToSupabase('SOP', () => _upsertSop(sop))
      },
      updateSop: (id, data) => {
        const next = get().sops.find(s2 => s2.id === id)
        set(s => ({ sops: s.sops.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }))
        if (next) syncToSupabase('SOP', () => _upsertSop({ ...next, ...data }))
      },
      deleteSop: (id) => {
        set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) }))
        syncToSupabase('SOP', () => _deleteSop(id))
      },

      // TimeEntries
      addTimeEntry: (entry) => {
        set(s => ({ timeEntries: [...s.timeEntries, entry] }))
        syncToSupabase('heures', () => _upsertTimeEntry(entry))
      },
      updateTimeEntry: (id, data) => {
        const next = get().timeEntries.find(te => te.id === id)
        set(s => ({ timeEntries: s.timeEntries.map(te => te.id === id ? { ...te, ...data } : te) }))
        if (next) syncToSupabase('heures', () => _upsertTimeEntry({ ...next, ...data }))
      },

      // ServiceTypes
      addServiceType: (serviceType) => {
        set(s => ({ serviceTypes: [...s.serviceTypes, serviceType] }))
        syncToSupabase('type de service', () => _upsertServiceType(serviceType))
      },
      updateServiceType: (id, data) => {
        const next = get().serviceTypes.find(st => st.id === id)
        set(s => ({ serviceTypes: s.serviceTypes.map(st => st.id === id ? { ...st, ...data } : st) }))
        if (next) syncToSupabase('type de service', () => _upsertServiceType({ ...next, ...data }))
      },
      deleteServiceType: (id) => {
        set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) }))
        syncToSupabase('type de service', () => _deleteServiceType(id))
      },

      // Quotes
      addQuote: (quote) => {
        set(s => ({ quotes: [...s.quotes, quote] }))
        syncToSupabase('devis', () => _upsertQuote(quote))
      },
      updateQuote: (id, data) => {
        const next = get().quotes.find(q => q.id === id)
        set(s => ({ quotes: s.quotes.map(q => q.id === id ? { ...q, ...data } : q) }))
        if (next) syncToSupabase('devis', () => _upsertQuote({ ...next, ...data }))
      },
      deleteQuote: (id) => {
        set(s => ({ quotes: s.quotes.filter(q => q.id !== id) }))
        syncToSupabase('devis', () => _deleteQuote(id))
      },
      sendQuote: (quoteId) => {
        const state = get()
        const quote = state.quotes.find(q => q.id === quoteId)
        if (!quote) return
        const now = new Date().toISOString()
        const opp = state.opportunities.find(o => o.id === quote.opportunity_id)
        const updatedQuote: Quote = { ...quote, status: 'envoye', updated_at: now }
        set(s => ({
          quotes: s.quotes.map(q => q.id === quoteId ? updatedQuote : q),
          opportunities: s.opportunities.map(o =>
            o.id === quote.opportunity_id ? { ...o, stage: 'proposition', updated_at: now } : o
          ),
        }))
        syncToSupabase('devis', () => _upsertQuote(updatedQuote))
        if (opp) syncToSupabase('opportunité', () => _upsertOpportunity({ ...opp, stage: 'proposition', updated_at: now }))
      },
      signQuote: (quoteId) => {
        const state = get()
        const quote = state.quotes.find(q => q.id === quoteId)
        if (!quote) return
        const now = new Date().toISOString()
        const opp = state.opportunities.find(o => o.id === quote.opportunity_id)
        const updatedQuote: Quote = { ...quote, status: 'signe', signed_at: now, updated_at: now }

        set(s => ({
          quotes: s.quotes.map(q => q.id === quoteId ? updatedQuote : q),
          opportunities: s.opportunities.map(o =>
            o.id === quote.opportunity_id ? { ...o, stage: 'gagne', updated_at: now } : o
          ),
        }))
        syncToSupabase('devis', () => _upsertQuote(updatedQuote))
        if (opp) syncToSupabase('opportunité', () => _upsertOpportunity({ ...opp, stage: 'gagne', updated_at: now }))

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

      hydrateCompanyData: (data) => set(s => ({
        agents: data.agents,
        clients: data.clients,
        sites: data.sites,
        leads: data.leads,
        opportunities: data.opportunities,
        missions: data.missions,
        operationalItems: data.operationalItems,
        sops: data.sops,
        timeEntries: data.timeEntries,
        serviceTypes: data.serviceTypes,
        quotes: data.quotes,
        // Mirror the DB pricing settings into the companySettings slice so
        // time-entry total_cost computation (BUG-MAJ-05) has a fallback to
        // the company default when te.hourly_cost is null.
        companySettings: {
          ...s.companySettings,
          hourly_labor_cost: data.pricingSettings?.hourly_labor_cost ?? null,
        },
      })),
    }),
    {
      name: 'proprely-store',
      // v3 : ne persiste plus les données business en mode réel (re-hydratées
      // depuis Supabase à chaque mount via SupabaseHydrator). On garde la
      // persistance complète en dummy mode pour démo offline.
      version: 3,
      partialize: (state) => (isSupabaseClient()
        ? { companySettings: state.companySettings }
        : state
      ) as Partial<AppStore>,
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
