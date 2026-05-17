export type LeadStatus = 'nouveau' | 'qualifie' | 'a_contacter' | 'contacte' | 'converti' | 'rejete'
export type OpportunityStage = 'lead' | 'prise_de_contact' | 'decouverte' | 'proposition' | 'negociation' | 'gagnee' | 'perdue'
export type MissionStatus = 'prevue' | 'en_cours' | 'terminee' | 'a_valider' | 'probleme_signale' | 'annulee'
export type AgentStatus = 'disponible' | 'occupe' | 'absent' | 'inactif'
export type ContractType = 'auto_entrepreneur' | 'cdd' | 'cdi' | 'extra' | 'sous_traitant'
export type TimeEntryStatus = 'prevue' | 'a_valider' | 'validee' | 'corrigee'
export type OperationalItemStatus = 'a_organiser' | 'en_cours' | 'planifie' | 'annule'
export type DevisStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire'
export type FactureStatus = 'brouillon' | 'envoyee' | 'payee' | 'retard' | 'annulee'
export type TaskPriority = 'basse' | 'normale' | 'haute'
export type DocumentType = 'dmc' | 'deap' | 'prev' | 'prev2' | 'rib' | 'contrat' | 'assurance' | 'autre'
export type DocumentStatus = 'valide' | 'expire' | 'en_attente' | 'manquant'
export type ContratStatus = 'brouillon' | 'envoye' | 'signe' | 'resilie' | 'expire'
export type ContratType = 'prestation' | 'maintenance' | 'ponctuel' | 'abonnement'

export interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  company_id: string
  company_name: string
  sector: string | null
  city: string | null
  email: string | null
  phone: string | null
  website: string | null
  source: string | null
  ai_score: number | null
  probable_need: string | null
  status: LeadStatus
  notes: string | null
  converted_opportunity_id: string | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  company_id: string
  lead_id: string | null
  client_id: string | null
  site_id: string | null
  title: string
  prospect_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  site_address: string | null
  client_type: string | null
  service_type: string | null
  estimated_amount: number | null
  stage: OpportunityStage
  next_action_date: string | null
  notes: string | null
  status: string
  converted_to_client: boolean
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  billing_address: string | null
  city: string | null
  client_type: string | null
  status: string
  notes: string | null
  created_from_opportunity_id: string | null
  // RIB
  iban: string | null
  bic: string | null
  titulaire_compte: string | null
  created_at: string
  updated_at: string
  sites?: Site[]
}

export interface Site {
  id: string
  company_id: string
  client_id: string
  name: string
  address: string | null
  city: string | null
  surface_area: number | null
  access_code: string | null
  access_instructions: string | null
  service_type: string | null
  frequency: string | null
  sop_id: string | null
  notes: string | null
  created_from_opportunity_id: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface Agent {
  id: string
  company_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  specialty: string | null
  skills: string[]
  business_registration_number: string | null
  contract_type: ContractType
  weekly_availability_hours: number
  weekly_availability: Record<string, boolean>
  zone: string | null
  status: AgentStatus
  hourly_cost: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Sop {
  id: string
  company_id: string
  title: string
  service_type: string | null
  estimated_duration_minutes: number | null
  required_skills: string[]
  required_materials: string[]
  required_products: string[]
  checklist_items: { id: string; text: string; completed?: boolean }[]
  safety_instructions: string | null
  notes: string | null
  frequency?: string
  associated_site_ids?: string[]
  created_at: string
  updated_at: string
}

export interface OperationalItem {
  id: string
  company_id: string
  client_id: string
  site_id: string
  opportunity_id: string | null
  source: string
  title: string
  status: OperationalItemStatus
  priority: string
  notes: string | null
  converted_to_mission: boolean
  mission_id: string | null
  created_at: string
  updated_at: string
  client?: Client
  site?: Site
}

export interface Mission {
  id: string
  company_id: string
  client_id: string
  site_id: string
  operational_item_id: string | null
  service_type: string | null
  sop_id: string | null
  status: MissionStatus
  scheduled_date: string
  start_time: string | null
  planned_hours: number
  notes: string | null
  priority: string
  rapport?: MissionRapport | null
  created_at: string
  updated_at: string
  client?: Client
  site?: Site
  agents?: Agent[]
  sop?: Sop
}

export interface MissionRapport {
  qualite: 'excellent' | 'bon' | 'moyen' | 'insuffisant'
  incidents: string
  commentaires: string
  heures_reelles: number
  completed_at: string
}

export interface MissionAgent {
  id: string
  mission_id: string
  agent_id: string
  assigned_at: string
  agent?: Agent
}

export interface TimeEntry {
  id: string
  company_id: string
  mission_id: string
  agent_id: string
  client_id: string
  site_id: string
  date: string
  planned_hours: number
  validated_hours: number | null
  hourly_cost: number | null
  total_cost: number | null
  status: TimeEntryStatus
  validated_at: string | null
  created_at: string
  updated_at: string
  agent?: Agent
  mission?: Mission
  client?: Client
  site?: Site
}

export interface ServiceType {
  id: string
  company_id: string
  name: string
  estimated_duration_minutes: number | null
  indicative_price: number | null
  default_sop_id: string | null
  created_at: string
  updated_at: string
}

export interface DevisLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  tva_rate: number
}

export interface Devis {
  id: string
  company_id: string
  number: string
  opportunity_id: string | null
  client_id: string | null
  site_id: string | null
  title: string
  lines: DevisLine[]
  tva_rate: number
  status: DevisStatus
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FactureLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  tva_rate: number
}

export interface Facture {
  id: string
  company_id: string
  number: string
  devis_id: string | null
  client_id: string | null
  site_id: string | null
  mission_id: string | null
  opportunity_id: string | null
  title: string
  lines: FactureLine[]
  tva_rate: number
  status: FactureStatus
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  company_id: string
  opportunity_id: string | null
  client_id: string | null
  mission_id: string | null
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  priority: TaskPriority
  created_at: string
  updated_at: string
}

export interface ClientDocument {
  id: string
  company_id: string
  client_id: string
  opportunity_id: string | null
  type: DocumentType
  name: string
  status: DocumentStatus
  expiry_date: string | null
  notes: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

export interface Contrat {
  id: string
  company_id: string
  client_id: string
  opportunity_id: string | null
  number: string
  title: string
  type: ContratType
  status: ContratStatus
  start_date: string | null
  end_date: string | null
  monthly_amount: number | null
  total_amount: number | null
  signed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AppNotification {
  id: string
  type: 'facture_retard' | 'validation_requise' | 'document_expire' | 'devis_sans_reponse' | 'a_organiser' | 'contrat_expire'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
  link: string
  created_at: string
  read: boolean
}
