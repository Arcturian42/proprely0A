-- Proprely Admin - Database Schema

-- Companies (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (prospects)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  source TEXT,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  probable_need TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'qualifie', 'a_contacter', 'contacte', 'converti', 'rejete')),
  notes TEXT,
  converted_opportunity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities (pipeline)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  client_id UUID,
  site_id UUID,
  title TEXT NOT NULL,
  prospect_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  site_address TEXT,
  client_type TEXT,
  service_type TEXT,
  estimated_amount NUMERIC(10,2),
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'prise_de_contact', 'decouverte', 'proposition', 'negociation', 'gagnee', 'perdue')),
  next_action_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ouvert',
  converted_to_client BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  city TEXT,
  client_type TEXT,
  status TEXT NOT NULL DEFAULT 'actif',
  notes TEXT,
  created_from_opportunity_id UUID REFERENCES opportunities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  surface_area NUMERIC(10,2),
  access_code TEXT,
  access_instructions TEXT,
  service_type TEXT,
  frequency TEXT,
  sop_id UUID,
  notes TEXT,
  created_from_opportunity_id UUID REFERENCES opportunities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOPs (Standard Operating Procedures)
CREATE TABLE sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  service_type TEXT,
  estimated_duration_minutes INTEGER,
  required_skills TEXT[] DEFAULT '{}',
  required_materials TEXT[] DEFAULT '{}',
  required_products TEXT[] DEFAULT '{}',
  checklist_items JSONB DEFAULT '[]',
  safety_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialty TEXT,
  skills TEXT[] DEFAULT '{}',
  business_registration_number TEXT,
  contract_type TEXT NOT NULL DEFAULT 'cdi' CHECK (contract_type IN ('auto_entrepreneur', 'cdd', 'cdi', 'extra', 'sous_traitant')),
  weekly_availability_hours INTEGER DEFAULT 35,
  weekly_availability JSONB DEFAULT '{}',
  zone TEXT,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'occupe', 'absent', 'inactif')),
  hourly_cost NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational items (cockpit)
CREATE TABLE operational_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  opportunity_id UUID REFERENCES opportunities(id),
  source TEXT NOT NULL DEFAULT 'contrat',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_organiser' CHECK (status IN ('a_organiser', 'en_cours', 'planifie', 'annule')),
  priority TEXT NOT NULL DEFAULT 'normale',
  notes TEXT,
  converted_to_mission BOOLEAN DEFAULT FALSE,
  mission_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missions
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  operational_item_id UUID REFERENCES operational_items(id),
  service_type TEXT,
  sop_id UUID REFERENCES sops(id),
  status TEXT NOT NULL DEFAULT 'prevue' CHECK (status IN ('prevue', 'en_cours', 'terminee', 'a_valider', 'probleme_signale', 'annulee')),
  scheduled_date DATE NOT NULL,
  start_time TIME,
  planned_hours NUMERIC(5,2) NOT NULL DEFAULT 2,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normale',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission agents (many-to-many)
CREATE TABLE mission_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, agent_id)
);

-- Time entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  date DATE NOT NULL,
  planned_hours NUMERIC(5,2) NOT NULL,
  validated_hours NUMERIC(5,2),
  hourly_cost NUMERIC(8,2),
  total_cost NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'prevue' CHECK (status IN ('prevue', 'a_valider', 'validee', 'corrigee')),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service types
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estimated_duration_minutes INTEGER,
  indicative_price NUMERIC(10,2),
  default_sop_id UUID REFERENCES sops(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Refonte Cockpit & Agents (Phase A + B) — migrations additives
-- ============================================================

-- 1. Statut opérationnel mission (coexiste avec `status` legacy)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS operational_status TEXT
  CHECK (operational_status IN (
    'a_organiser','en_preparation','en_attente_validation_client',
    'planifie','en_cours','terminee','incident'
  )) DEFAULT 'a_organiser';

-- 2. Enrichissement mission
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS estimated_workers INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_profitability NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS urgency TEXT,
  ADD COLUMN IF NOT EXISTS recurrence TEXT,
  ADD COLUMN IF NOT EXISTS required_machines TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consumables TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parking_notes TEXT,
  ADD COLUMN IF NOT EXISTS floor_count INTEGER,
  ADD COLUMN IF NOT EXISTS organization_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 3. Expertises agents (avec niveau)
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debutant','intermediaire','expert')),
  UNIQUE(agent_id, skill)
);

-- 4. Certifications agents
CREATE TABLE IF NOT EXISTS agent_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('machine','hauteur','chimie','permis','autre')),
  issued_at DATE,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Blocs de disponibilité / indispos / vacances
CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('vacances','indispo','preferer')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Historique de workload (semaine)
CREATE TABLE IF NOT EXISTS workload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  hours_worked NUMERIC(6,2) DEFAULT 0,
  missions_count INTEGER DEFAULT 0,
  consecutive_days INTEGER DEFAULT 0,
  night_shifts INTEGER DEFAULT 0,
  UNIQUE(agent_id, week_start)
);

-- 7. Score de fatigue (snapshot courant)
CREATE TABLE IF NOT EXISTS fatigue_scores (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL CHECK (label IN ('ok','charge','surcharge','burnout')),
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Contraintes opérationnelles par site
CREATE TABLE IF NOT EXISTS client_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  preferred_days TEXT[] DEFAULT '{}',
  preferred_hours_start TIME,
  preferred_hours_end TIME,
  access_hours_start TIME,
  access_hours_end TIME,
  keys_alarm TEXT,
  parking TEXT,
  elevator BOOLEAN DEFAULT FALSE,
  noise_restrictions TEXT,
  equipment_access TEXT,
  urgency TEXT,
  recurrence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Propositions de scheduling
CREATE TABLE IF NOT EXISTS scheduling_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  proposed_start TIMESTAMPTZ NOT NULL,
  proposed_end TIMESTAMPTZ NOT NULL,
  score NUMERIC(5,2) DEFAULT 0,
  recommended_agent_ids UUID[] DEFAULT '{}',
  rationale JSONB DEFAULT '{}',
  selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_certs_agent ON agent_certifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_agent ON availability_blocks(agent_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_proposals_mission ON scheduling_proposals(mission_id);
CREATE INDEX IF NOT EXISTS idx_missions_operational_status ON missions(operational_status);

-- Indexes (existing)
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_sites_client ON sites(client_id);
CREATE INDEX idx_agents_company ON agents(company_id);
CREATE INDEX idx_missions_scheduled_date ON missions(scheduled_date);
CREATE INDEX idx_missions_company ON missions(company_id);
CREATE INDEX idx_time_entries_agent ON time_entries(agent_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
