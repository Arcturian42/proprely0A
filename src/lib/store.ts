'use client'

import { create } from 'zustand'
import {
  Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry, MissionStatus, ServiceType
} from '@/types'
import * as db from '@/lib/supabase/db'
import { toast } from 'sonner'

interface CompanySettings {
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

interface AppStore {
  // Identity
  companyId: string | null
  companySettings: CompanySettings
  isLoading: boolean

  // Data
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

  // Initialization
  initializeFromDB: (companyId: string, settings: Partial<CompanySettings>) => Promise<void>
  clearStore: () => void

  // Agents
  addAgent: (data: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateAgent: (id: string, data: Partial<Agent>) => Promise<void>
  deleteAgent: (id: string) => Promise<void>

  // Clients
  addClient: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  // Sites
  addSite: (data: Omit<Site, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateSite: (id: string, data: Partial<Site>) => Promise<void>
  deleteSite: (id: string) => Promise<void>

  // Leads
  addLead: (data: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>
  deleteLead: (id: string) => Promise<void>

  // Opportunities
  addOpportunity: (data: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateOpportunity: (id: string, data: Partial<Opportunity>) => Promise<void>
  deleteOpportunity: (id: string) => Promise<void>
  winOpportunity: (id: string) => Promise<void>

  // Missions
  addMission: (data: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'client' | 'site' | 'agents' | 'sop'>, agentIds: string[]) => Promise<void>
  updateMission: (id: string, data: Partial<Mission>) => Promise<void>
  deleteMission: (id: string) => Promise<void>
  updateMissionStatus: (id: string, status: MissionStatus, validatedHours?: number) => Promise<void>

  // OperationalItems
  addOperationalItem: (data: Omit<OperationalItem, 'id' | 'created_at' | 'updated_at' | 'client' | 'site'>) => Promise<void>
  updateOperationalItem: (id: string, data: Partial<OperationalItem>) => Promise<void>
  deleteOperationalItem: (id: string) => Promise<void>

  // SOPs
  addSop: (data: Omit<Sop, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateSop: (id: string, data: Partial<Sop>) => Promise<void>
  deleteSop: (id: string) => Promise<void>

  // TimeEntries
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'agent' | 'mission' | 'client' | 'site'>) => Promise<void>
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>

  // ServiceTypes
  addServiceType: (data: Omit<ServiceType, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateServiceType: (id: string, data: Partial<ServiceType>) => Promise<void>
  deleteServiceType: (id: string) => Promise<void>

  // Company settings
  updateCompanySettings: (settings: Partial<CompanySettings>) => void
}

function handleError(err: unknown, action: string) {
  console.error(`[store] ${action}:`, err)
  const msg = err instanceof Error ? err.message : 'Erreur inconnue'
  toast.error(`${action} : ${msg}`)
}

export const useAppStore = create<AppStore>()((set, get) => ({
  companyId: null,
  companySettings: defaultCompanySettings,
  isLoading: false,

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

  initializeFromDB: async (companyId, settings) => {
    set({ isLoading: true, companyId, companySettings: { ...defaultCompanySettings, ...settings } })
    try {
      const [leads, opportunities, clients, sites, agents, sops, missions, operationalItems, timeEntries, serviceTypes] = await Promise.all([
        db.fetchLeads(companyId),
        db.fetchOpportunities(companyId),
        db.fetchClients(companyId),
        db.fetchSites(companyId),
        db.fetchAgents(companyId),
        db.fetchSops(companyId),
        db.fetchMissions(companyId),
        db.fetchOperationalItems(companyId),
        db.fetchTimeEntries(companyId),
        db.fetchServiceTypes(companyId),
      ])
      set({ leads, opportunities, clients, sites, agents, sops, missions, operationalItems, timeEntries, serviceTypes })
    } catch (err) {
      handleError(err, 'Chargement des données')
    } finally {
      set({ isLoading: false })
    }
  },

  clearStore: () => set({
    companyId: null,
    agents: [], clients: [], leads: [], missions: [],
    opportunities: [], operationalItems: [], sites: [],
    sops: [], timeEntries: [], serviceTypes: [],
    companySettings: defaultCompanySettings,
  }),

  // ─── Agents ──────────────────────────────────────────────────────────────────

  addAgent: async (data) => {
    try {
      const agent = await db.insertAgent(data)
      set(s => ({ agents: [agent, ...s.agents] }))
    } catch (err) { handleError(err, 'Ajout agent') }
  },

  updateAgent: async (id, data) => {
    try {
      const updated = await db.patchAgent(id, data)
      set(s => ({ agents: s.agents.map(a => a.id === id ? updated : a) }))
    } catch (err) { handleError(err, 'Modification agent') }
  },

  deleteAgent: async (id) => {
    try {
      await db.removeAgent(id)
      set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
    } catch (err) { handleError(err, 'Suppression agent') }
  },

  // ─── Clients ─────────────────────────────────────────────────────────────────

  addClient: async (data) => {
    try {
      const client = await db.insertClient(data)
      set(s => ({ clients: [client, ...s.clients] }))
    } catch (err) { handleError(err, 'Ajout client') }
  },

  updateClient: async (id, data) => {
    try {
      const updated = await db.patchClient(id, data)
      set(s => ({ clients: s.clients.map(c => c.id === id ? updated : c) }))
    } catch (err) { handleError(err, 'Modification client') }
  },

  deleteClient: async (id) => {
    try {
      await db.removeClient(id)
      set(s => ({
        clients: s.clients.filter(c => c.id !== id),
        sites: s.sites.filter(s2 => s2.client_id !== id),
      }))
    } catch (err) { handleError(err, 'Suppression client') }
  },

  // ─── Sites ───────────────────────────────────────────────────────────────────

  addSite: async (data) => {
    try {
      const site = await db.insertSite(data)
      set(s => ({ sites: [site, ...s.sites] }))
    } catch (err) { handleError(err, 'Ajout site') }
  },

  updateSite: async (id, data) => {
    try {
      const updated = await db.patchSite(id, data)
      set(s => ({ sites: s.sites.map(s2 => s2.id === id ? updated : s2) }))
    } catch (err) { handleError(err, 'Modification site') }
  },

  deleteSite: async (id) => {
    try {
      await db.removeSite(id)
      set(s => ({ sites: s.sites.filter(s2 => s2.id !== id) }))
    } catch (err) { handleError(err, 'Suppression site') }
  },

  // ─── Leads ───────────────────────────────────────────────────────────────────

  addLead: async (data) => {
    try {
      const lead = await db.insertLead(data)
      set(s => ({ leads: [lead, ...s.leads] }))
    } catch (err) { handleError(err, 'Ajout lead') }
  },

  updateLead: async (id, data) => {
    try {
      const updated = await db.patchLead(id, data)
      set(s => ({ leads: s.leads.map(l => l.id === id ? updated : l) }))
    } catch (err) { handleError(err, 'Modification lead') }
  },

  deleteLead: async (id) => {
    try {
      await db.removeLead(id)
      set(s => ({ leads: s.leads.filter(l => l.id !== id) }))
    } catch (err) { handleError(err, 'Suppression lead') }
  },

  // ─── Opportunities ───────────────────────────────────────────────────────────

  addOpportunity: async (data) => {
    try {
      const opp = await db.insertOpportunity(data)
      set(s => ({ opportunities: [opp, ...s.opportunities] }))
    } catch (err) { handleError(err, 'Ajout opportunité') }
  },

  updateOpportunity: async (id, data) => {
    try {
      const updated = await db.patchOpportunity(id, data)
      set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? updated : o) }))
    } catch (err) { handleError(err, 'Modification opportunité') }
  },

  deleteOpportunity: async (id) => {
    try {
      await db.removeOpportunity(id)
      set(s => ({ opportunities: s.opportunities.filter(o => o.id !== id) }))
    } catch (err) { handleError(err, 'Suppression opportunité') }
  },

  winOpportunity: async (id) => {
    const state = get()
    const opp = state.opportunities.find(o => o.id === id)
    if (!opp || opp.converted_to_client || !state.companyId) return

    const companyId = state.companyId
    const now = new Date().toISOString()

    try {
      // Create client
      const newClient = await db.insertClient({
        company_id: companyId,
        name: opp.prospect_name,
        contact_name: opp.contact_name,
        email: opp.email,
        phone: opp.phone,
        billing_address: opp.site_address,
        city: opp.city,
        client_type: opp.client_type,
        status: 'actif',
        notes: opp.notes,
        created_from_opportunity_id: opp.id,
      })

      // Create site
      const newSite = await db.insertSite({
        company_id: companyId,
        client_id: newClient.id,
        name: `Site ${opp.prospect_name}`,
        address: opp.site_address,
        city: opp.city,
        service_type: opp.service_type,
        surface_area: null,
        access_code: null,
        access_instructions: null,
        frequency: null,
        sop_id: null,
        notes: null,
        created_from_opportunity_id: opp.id,
      })

      // Create operational item
      const newItem = await db.insertOperationalItem({
        company_id: companyId,
        client_id: newClient.id,
        site_id: newSite.id,
        opportunity_id: opp.id,
        source: 'pipeline',
        title: `${opp.prospect_name} — à organiser`,
        status: 'a_organiser',
        priority: 'normal',
        notes: null,
        converted_to_mission: false,
        mission_id: null,
      })

      // Update opportunity
      const updatedOpp = await db.patchOpportunity(id, {
        stage: 'gagnee',
        converted_to_client: true,
        converted_at: now,
        client_id: newClient.id,
        site_id: newSite.id,
      })

      set(s => ({
        opportunities: s.opportunities.map(o => o.id === id ? updatedOpp : o),
        clients: [newClient, ...s.clients],
        sites: [newSite, ...s.sites],
        operationalItems: [newItem, ...s.operationalItems],
      }))

      toast.success('Opportunité convertie en client !')
    } catch (err) { handleError(err, 'Conversion opportunité') }
  },

  // ─── Missions ────────────────────────────────────────────────────────────────

  addMission: async (data, agentIds) => {
    try {
      const mission = await db.insertMission(data, agentIds)
      set(s => ({ missions: [mission, ...s.missions] }))
    } catch (err) { handleError(err, 'Ajout mission') }
  },

  updateMission: async (id, data) => {
    try {
      const updated = await db.patchMission(id, data)
      set(s => ({ missions: s.missions.map(m => m.id === id ? { ...s.missions.find(x => x.id === id)!, ...updated } : m) }))
    } catch (err) { handleError(err, 'Modification mission') }
  },

  deleteMission: async (id) => {
    try {
      await db.removeMission(id)
      set(s => ({ missions: s.missions.filter(m => m.id !== id) }))
    } catch (err) { handleError(err, 'Suppression mission') }
  },

  updateMissionStatus: async (id, status, validatedHours) => {
    try {
      const updated = await db.patchMission(id, { status })
      set(s => ({ missions: s.missions.map(m => m.id === id ? { ...m, ...updated } : m) }))
      if (validatedHours !== undefined) {
        const te = get().timeEntries.find(t => t.mission_id === id)
        if (te) {
          const updatedTe = await db.patchTimeEntry(te.id, {
            status: 'validee',
            validated_hours: validatedHours,
            validated_at: new Date().toISOString(),
          })
          set(s => ({ timeEntries: s.timeEntries.map(t => t.id === te.id ? updatedTe : t) }))
        }
      }
    } catch (err) { handleError(err, 'Mise à jour statut mission') }
  },

  // ─── OperationalItems ────────────────────────────────────────────────────────

  addOperationalItem: async (data) => {
    try {
      const item = await db.insertOperationalItem(data)
      set(s => ({ operationalItems: [item, ...s.operationalItems] }))
    } catch (err) { handleError(err, 'Ajout opération') }
  },

  updateOperationalItem: async (id, data) => {
    try {
      const updated = await db.patchOperationalItem(id, data)
      set(s => ({ operationalItems: s.operationalItems.map(i => i.id === id ? updated : i) }))
    } catch (err) { handleError(err, 'Modification opération') }
  },

  deleteOperationalItem: async (id) => {
    try {
      await db.removeOperationalItem(id)
      set(s => ({ operationalItems: s.operationalItems.filter(i => i.id !== id) }))
    } catch (err) { handleError(err, 'Suppression opération') }
  },

  // ─── SOPs ────────────────────────────────────────────────────────────────────

  addSop: async (data) => {
    try {
      const sop = await db.insertSop(data)
      set(s => ({ sops: [sop, ...s.sops] }))
    } catch (err) { handleError(err, 'Ajout SOP') }
  },

  updateSop: async (id, data) => {
    try {
      const updated = await db.patchSop(id, data)
      set(s => ({ sops: s.sops.map(s2 => s2.id === id ? updated : s2) }))
    } catch (err) { handleError(err, 'Modification SOP') }
  },

  deleteSop: async (id) => {
    try {
      await db.removeSop(id)
      set(s => ({ sops: s.sops.filter(s2 => s2.id !== id) }))
    } catch (err) { handleError(err, 'Suppression SOP') }
  },

  // ─── TimeEntries ─────────────────────────────────────────────────────────────

  addTimeEntry: async (data) => {
    try {
      const entry = await db.insertTimeEntry(data)
      set(s => ({ timeEntries: [entry, ...s.timeEntries] }))
    } catch (err) { handleError(err, 'Ajout saisie heures') }
  },

  updateTimeEntry: async (id, data) => {
    try {
      const updated = await db.patchTimeEntry(id, data)
      set(s => ({ timeEntries: s.timeEntries.map(te => te.id === id ? updated : te) }))
    } catch (err) { handleError(err, 'Modification saisie heures') }
  },

  // ─── ServiceTypes ─────────────────────────────────────────────────────────────

  addServiceType: async (data) => {
    try {
      const st = await db.insertServiceType(data)
      set(s => ({ serviceTypes: [...s.serviceTypes, st] }))
    } catch (err) { handleError(err, 'Ajout type de service') }
  },

  updateServiceType: async (id, data) => {
    try {
      const updated = await db.patchServiceType(id, data)
      set(s => ({ serviceTypes: s.serviceTypes.map(st => st.id === id ? updated : st) }))
    } catch (err) { handleError(err, 'Modification type de service') }
  },

  deleteServiceType: async (id) => {
    try {
      await db.removeServiceType(id)
      set(s => ({ serviceTypes: s.serviceTypes.filter(st => st.id !== id) }))
    } catch (err) { handleError(err, 'Suppression type de service') }
  },

  // ─── Company settings ─────────────────────────────────────────────────────────

  updateCompanySettings: (settings) => set(s => ({ companySettings: { ...s.companySettings, ...settings } })),
}))
