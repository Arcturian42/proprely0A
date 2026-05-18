export type LeadStatus = 'nouveau' | 'qualifie' | 'a_contacter' | 'contacte' | 'converti' | 'rejete'
export type OpportunityStage = 'ouvert' | 'decouverte' | 'proposition' | 'negociation' | 'gagne' | 'perdu'
export type MissionStatus = 'prevue' | 'en_cours' | 'terminee' | 'a_valider' | 'probleme_signale' | 'annulee'
export type AgentStatus = 'disponible' | 'occupe' | 'absent' | 'inactif'
export type ContractType = 'auto_entrepreneur' | 'cdd' | 'cdi' | 'extra' | 'sous_traitant'
export type TimeEntryStatus = 'prevue' | 'a_valider' | 'validee' | 'corrigee'
export type OperationalItemStatus = 'a_organiser' | 'en_cours' | 'planifie' | 'annule'
export type QuoteStatus = 'brouillon' | 'envoye' | 'signe' | 'refuse' | 'expire'
export type ServiceCategory = 'fin_chantier' | 'terrasse' | 'sols_mecanises' | 'moquette' | 'bureaux_recurrent' | 'vitres' | 'autre'

export type OperationalMissionStatus =
  | 'a_organiser'
  | 'en_preparation'
  | 'en_attente_validation_client'
  | 'planifie'
  | 'en_cours'
  | 'terminee'
  | 'incident'

export type SkillLevel = 'debutant' | 'intermediaire' | 'expert'
export type CertificationCategory = 'machine' | 'hauteur' | 'chimie' | 'permis' | 'autre'
export type AvailabilityBlockKind = 'vacances' | 'indispo' | 'preferer'
export type FatigueLabel = 'ok' | 'charge' | 'surcharge' | 'burnout'

export interface AgentSkill {
  id: string
  agent_id: string
  skill: string
  level: SkillLevel
}

export interface AgentCertification {
  id: string
  agent_id: string
  name: string
  category: CertificationCategory
  issued_at: string | null
  expires_at: string | null
}

export interface AvailabilityBlock {
  id: string
  agent_id: string
  start_at: string
  end_at: string
  kind: AvailabilityBlockKind
  notes: string | null
}

export interface WorkloadEntry {
  agent_id: string
  week_start: string
  hours_worked: number
  missions_count: number
  consecutive_days: number
  night_shifts: number
}

export interface FatigueScore {
  agent_id: string
  score: number
  label: FatigueLabel
  computed_at: string
}

export interface ClientConstraint {
  id: string
  site_id: string
  preferred_days: string[]
  preferred_hours_start: string | null
  preferred_hours_end: string | null
  access_hours_start: string | null
  access_hours_end: string | null
  keys_alarm: string | null
  parking: string | null
  elevator: boolean
  noise_restrictions: string | null
  equipment_access: string | null
  urgency: string | null
  recurrence: string | null
}

export interface SchedulingProposal {
  id: string
  mission_id: string
  proposed_start: string
  proposed_end: string
  score: number
  recommended_agent_ids: string[]
  rationale: {
    skills_match: number
    workload: number
    fatigue: number
    preferences: number
    notes?: string
  }
  selected: boolean
  created_at: string
}

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
  contact_role: string | null
  email: string | null
  phone: string | null
  city: string | null
  postal_code: string | null
  site_address: string | null
  client_type: string | null
  service_type: string | null
  estimated_amount: number | null
  stage: OpportunityStage
  next_action_date: string | null
  next_action_type: string | null
  next_action_note: string | null
  notes: string | null
  siren: string | null
  siret: string | null
  naf_code: string | null
  legal_form: string | null
  company_status: string | null
  source: string | null
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
  operational_status?: OperationalMissionStatus
  scheduled_date: string
  start_time: string | null
  planned_hours: number
  notes: string | null
  priority: string
  // Organisation enrichie
  estimated_workers?: number | null
  estimated_profitability?: number | null
  urgency?: string | null
  recurrence?: string | null
  required_machines?: string[]
  consumables?: string[]
  equipment?: string[]
  parking_notes?: string | null
  floor_count?: number | null
  organization_step?: number
  required_skills?: string[]
  // Audit léger
  contact_name?: string | null
  contact_phone?: string | null
  created_at: string
  updated_at: string
  client?: Client
  site?: Site
  agents?: Agent[]
  sop?: Sop
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
  description: string | null
  estimated_duration_minutes: number | null
  indicative_price: number | null
  default_sop_id: string | null
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Onboarding multi-step ──────────────────────────────────────────────────

export type CalculationUnit =
  | 'm2'
  | 'linear_meter'
  | 'hour'
  | 'flat_rate'
  | 'room_count'
  | 'floor_count'
  | 'workstation_count'
  | 'weekly_passes'
  | 'other'

export type RecurrenceMode =
  | 'per_pass'
  | 'weekly'
  | 'monthly'
  | 'annual_contract'
  | 'one_shot'

export type EquipmentMode =
  | 'included'
  | 'separate_line'
  | 'per_quote_decision'

export type ConsumablesPolicy =
  | 'always_include'
  | 'never_include'
  | 'per_quote_decision'

export type TravelPolicy =
  | 'always_include'
  | 'never_include'
  | 'per_quote_decision'

export interface OnboardingStatus {
  company_id: string
  step_1_completed_at: string | null
  step_2_team_completed_at: string | null
  step_2_team_skipped_at: string | null
  step_3_services_completed_at: string | null
  step_3_services_skipped_at: string | null
  step_4_pricing_completed_at: string | null
  step_4_pricing_skipped_at: string | null
  step_5_settings_completed_at: string | null
  step_5_settings_skipped_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PricingRule {
  id: string
  company_id: string
  service_type_id: string
  calculation_unit: CalculationUnit
  calculation_unit_other: string | null
  base_price_ht: number | null
  estimated_time_minutes: number | null
  recommended_agents: number | null
  consumables_cost: number | null
  equipment_mode: EquipmentMode | null
  target_margin_pct: number | null
  default_vat_rate: number | null
  recurrence_mode: RecurrenceMode | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CompanyPricingSettings {
  company_id: string
  hourly_labor_cost: number | null
  default_target_margin_pct: number | null
  default_vat_rate: number | null
  consumables_policy: ConsumablesPolicy
  travel_policy: TravelPolicy
  equipment_mode: EquipmentMode
  default_recurrence_mode: RecurrenceMode
  meal_allowance_threshold_hours: number | null
  meal_allowance_amount: number | null
  machine_rental_daily_cost: number | null
  created_at: string
  updated_at: string
}

export interface SiteVisitExtraction {
  service_type: string
  surface_m2: number | null
  complexity_level: 'faible' | 'moyen' | 'élevé'
  floors: number | null
  obstacles: string[]
  machines_needed: string[]
  consumables: string[]
  estimated_duration_hours: number | null
  workers_needed: number | null
  frequency: string
  access_constraints: string
  parking_logistics: string
  urgency: 'normale' | 'urgent' | 'très urgent'
  client_requirements: string
  operational_recommendation: string
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

export interface QuoteCostBreakdown {
  labor_cost: number
  machines_cost: number
  consumables_cost: number
  transport_cost: number
  other_costs: number
  total_cost_ht: number
  margin_rate: number
  price_ht: number
  vat_rate: number
  price_ttc: number
}

export interface Quote {
  id: string
  company_id: string
  opportunity_id: string
  quote_number: string
  title: string
  service_category: ServiceCategory
  surface_m2: number | null
  status: QuoteStatus
  costs: QuoteCostBreakdown
  line_items: QuoteLineItem[]
  site_visit_notes: string | null
  extraction_data: SiteVisitExtraction | null
  docuseal_submission_id: string | null
  docuseal_signature_url: string | null
  signed_at: string | null
  client_name: string
  client_email: string | null
  created_at: string
  updated_at: string
}
