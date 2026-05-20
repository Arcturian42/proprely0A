import { z } from 'zod'

/**
 * Per-entity Zod schemas. Used by the generic upsert() server action to
 * validate payloads server-side before they hit Supabase — defence in depth
 * on top of RLS + CHECK constraints. RLS protects the tenant; these protect
 * data shape (right enum values, non-negative numbers, no junk fields, etc.).
 *
 * Two design choices worth flagging:
 * 1. IDs are `z.string().min(1)` rather than `z.uuid()`. Most rows are minted
 *    via crypto.randomUUID(), but a few legacy flows (QuoteFlow drafts) still
 *    use `quote-<timestamp>` style — Postgres will reject those at the UUID
 *    cast, which is the right place for that error. We don't double-fail here.
 * 2. company_id is omitted everywhere because upsert() overwrites it from the
 *    authenticated profile (never trust the client). Including it in the
 *    schema would imply we accept it, which we don't.
 */

const Id = z.string().min(1).max(64)
const ShortText = (max: number) => z.string().max(max).nullable().optional()
const NonNegative = z.number().nonnegative()
const Iso = z.string().max(64) // tolerant: covers ISO datetime, date, time strings

// ─── Leads ─────────────────────────────────────────────────────────────────

export const LeadSchema = z.object({
  id: Id,
  company_id: z.string().optional(), // overwritten server-side, ignored if present
  company_name: z.string().min(1).max(200),
  sector: ShortText(100),
  city: ShortText(100),
  email: z.string().email().max(200).nullable().optional(),
  phone: ShortText(50),
  website: ShortText(500),
  source: ShortText(100),
  ai_score: z.number().min(0).max(100).nullable().optional(),
  probable_need: ShortText(500),
  status: z.enum(['nouveau', 'qualifie', 'a_contacter', 'contacte', 'converti', 'rejete']),
  notes: ShortText(2000),
  converted_opportunity_id: Id.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Opportunities ─────────────────────────────────────────────────────────

export const OpportunitySchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  lead_id: Id.nullable().optional(),
  client_id: Id.nullable().optional(),
  site_id: Id.nullable().optional(),
  title: z.string().min(1).max(200),
  prospect_name: z.string().min(1).max(200),
  contact_name: ShortText(200),
  contact_role: ShortText(100),
  email: z.string().email().max(200).nullable().optional(),
  phone: ShortText(50),
  city: ShortText(100),
  postal_code: ShortText(20),
  site_address: ShortText(500),
  client_type: ShortText(50),
  service_type: ShortText(100),
  estimated_amount: NonNegative.nullable().optional(),
  stage: z.enum(['ouvert', 'decouverte', 'proposition', 'negociation', 'gagne', 'perdu']),
  next_action_date: Iso.nullable().optional(),
  next_action_type: ShortText(100),
  next_action_note: ShortText(500),
  notes: ShortText(2000),
  siren: ShortText(20),
  siret: ShortText(20),
  naf_code: ShortText(10),
  legal_form: ShortText(100),
  company_status: ShortText(50),
  source: ShortText(100),
  status: z.string().max(50),
  converted_to_client: z.boolean(),
  converted_at: Iso.nullable().optional(),
  lost_reason: ShortText(2000),
  lost_at: Iso.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Clients ───────────────────────────────────────────────────────────────

export const ClientSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  name: z.string().min(1).max(200),
  contact_name: ShortText(200),
  email: z.string().email().max(200).nullable().optional(),
  phone: ShortText(50),
  billing_address: ShortText(500),
  city: ShortText(100),
  client_type: ShortText(50),
  status: z.string().max(50),
  notes: ShortText(2000),
  created_from_opportunity_id: Id.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Sites ─────────────────────────────────────────────────────────────────

export const SiteSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  client_id: Id,
  name: z.string().min(1).max(200),
  address: ShortText(500),
  city: ShortText(100),
  surface_area: NonNegative.nullable().optional(),
  access_code: ShortText(100),
  access_instructions: ShortText(2000),
  service_type: ShortText(100),
  frequency: ShortText(50),
  sop_id: Id.nullable().optional(),
  notes: ShortText(2000),
  created_from_opportunity_id: Id.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Agents ────────────────────────────────────────────────────────────────

export const AgentSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: ShortText(50),
  email: z.string().email().max(200).nullable().optional(),
  specialty: ShortText(200),
  skills: z.array(z.string().max(100)).max(50),
  business_registration_number: ShortText(50),
  contract_type: z.enum(['auto_entrepreneur', 'cdd', 'cdi', 'extra', 'sous_traitant']),
  weekly_availability_hours: NonNegative.max(168),
  weekly_availability: z.record(z.string(), z.boolean()),
  zone: ShortText(100),
  status: z.enum(['disponible', 'occupe', 'absent', 'inactif']),
  hourly_cost: NonNegative.nullable().optional(),
  notes: ShortText(2000),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Missions ──────────────────────────────────────────────────────────────

export const MissionSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  client_id: Id,
  site_id: Id,
  operational_item_id: Id.nullable().optional(),
  service_type: ShortText(100),
  sop_id: Id.nullable().optional(),
  status: z.enum(['prevue', 'en_cours', 'terminee', 'a_valider', 'probleme_signale', 'annulee']),
  operational_status: z
    .enum(['a_organiser', 'en_preparation', 'en_attente_validation_client', 'planifie', 'en_cours', 'terminee', 'incident'])
    .nullable()
    .optional(),
  scheduled_date: z.string().min(8).max(64),
  start_time: ShortText(16),
  planned_hours: NonNegative.max(24),
  notes: ShortText(2000),
  priority: z.string().max(50),
  estimated_workers: z.number().int().min(0).max(50).nullable().optional(),
  estimated_profitability: z.number().nullable().optional(),
  urgency: ShortText(50),
  recurrence: ShortText(50),
  required_machines: z.array(z.string().max(100)).max(50).optional(),
  consumables: z.array(z.string().max(100)).max(50).optional(),
  equipment: z.array(z.string().max(100)).max(50).optional(),
  required_skills: z.array(z.string().max(100)).max(50).optional(),
  parking_notes: ShortText(500),
  floor_count: z.number().int().min(0).max(200).nullable().optional(),
  organization_step: z.number().int().min(0).max(10).optional(),
  contact_name: ShortText(200),
  contact_phone: ShortText(50),
  issue_category: z
    .enum(['acces_refuse', 'materiel_manquant', 'client_absent', 'site_non_conforme', 'incident_agent', 'autre'])
    .nullable()
    .optional(),
  issue_description: ShortText(2000),
  issue_photo_url: ShortText(2000),
  issue_reported_at: Iso.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Time entries ──────────────────────────────────────────────────────────

export const TimeEntrySchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  mission_id: Id,
  agent_id: Id,
  client_id: Id,
  site_id: Id,
  date: z.string().min(8).max(64),
  planned_hours: NonNegative.max(24),
  validated_hours: NonNegative.max(24).nullable().optional(),
  hourly_cost: NonNegative.nullable().optional(),
  total_cost: NonNegative.nullable().optional(),
  status: z.enum(['prevue', 'a_valider', 'validee', 'corrigee']),
  validated_at: Iso.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── SOPs ──────────────────────────────────────────────────────────────────

export const SopSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  title: z.string().min(1).max(200),
  service_type: ShortText(100),
  estimated_duration_minutes: z.number().int().min(0).max(10000).nullable().optional(),
  required_skills: z.array(z.string().max(100)).max(100),
  required_materials: z.array(z.string().max(200)).max(100),
  required_products: z.array(z.string().max(200)).max(100),
  checklist_items: z
    .array(z.object({
      id: z.string().max(64),
      text: z.string().max(500),
      completed: z.boolean().optional(),
    }))
    .max(200),
  safety_instructions: ShortText(2000),
  notes: ShortText(2000),
  frequency: ShortText(50),
  associated_site_ids: z.array(Id).max(500).optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Service types ─────────────────────────────────────────────────────────

export const ServiceTypeSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: ShortText(500),
  estimated_duration_minutes: z.number().int().min(0).max(10000).nullable().optional(),
  indicative_price: NonNegative.nullable().optional(),
  default_sop_id: Id.nullable().optional(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Operational items ─────────────────────────────────────────────────────

export const OperationalItemSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  client_id: Id,
  site_id: Id,
  opportunity_id: Id.nullable().optional(),
  source: z.string().max(50),
  title: z.string().min(1).max(200),
  status: z.enum(['a_organiser', 'en_cours', 'planifie', 'annule']),
  priority: z.string().max(50),
  notes: ShortText(2000),
  converted_to_mission: z.boolean(),
  mission_id: Id.nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Quotes ────────────────────────────────────────────────────────────────

const QuoteCostsSchema = z.object({
  labor_cost: NonNegative,
  machines_cost: NonNegative,
  consumables_cost: NonNegative,
  transport_cost: NonNegative,
  other_costs: NonNegative,
  total_cost_ht: NonNegative,
  margin_rate: z.number().min(-1).max(1),
  price_ht: NonNegative,
  vat_rate: z.number().min(0).max(1),
  price_ttc: NonNegative,
})

const QuoteLineItemSchema = z.object({
  id: z.string().max(64),
  description: z.string().max(500),
  quantity: z.number(),
  unit: z.string().max(50),
  unit_price: z.number(),
  total: z.number(),
})

export const QuoteSchema = z.object({
  id: Id,
  company_id: z.string().optional(),
  opportunity_id: Id,
  quote_number: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  service_category: z.enum(['fin_chantier', 'terrasse', 'sols_mecanises', 'moquette', 'bureaux_recurrent', 'vitres', 'autre']),
  surface_m2: NonNegative.nullable().optional(),
  status: z.enum(['brouillon', 'envoye', 'signe', 'refuse', 'expire']),
  costs: QuoteCostsSchema,
  // 500 max already enforced server-side in /api/quotes/send; matching here.
  line_items: z.array(QuoteLineItemSchema).max(500),
  site_visit_notes: ShortText(5000),
  extraction_data: z.unknown().nullable().optional(),
  docuseal_submission_id: ShortText(100),
  docuseal_signature_url: ShortText(1000),
  signed_at: Iso.nullable().optional(),
  client_name: z.string().min(1).max(200),
  client_email: z.string().email().max(200).nullable().optional(),
  created_at: Iso.optional(),
  updated_at: Iso.optional(),
}).passthrough()

// ─── Dispatcher ────────────────────────────────────────────────────────────

// Maps table name → schema. Tables not in the map upsert without app-level
// validation (still protected by RLS + DB constraints) — add the schema here
// when you ship a new entity.
const SCHEMA_BY_TABLE: Record<string, z.ZodTypeAny> = {
  leads: LeadSchema,
  opportunities: OpportunitySchema,
  clients: ClientSchema,
  sites: SiteSchema,
  agents: AgentSchema,
  missions: MissionSchema,
  time_entries: TimeEntrySchema,
  sops: SopSchema,
  service_types: ServiceTypeSchema,
  operational_items: OperationalItemSchema,
  quotes: QuoteSchema,
}

export function getEntitySchema(table: string): z.ZodTypeAny | null {
  return SCHEMA_BY_TABLE[table] ?? null
}
