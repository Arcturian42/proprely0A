-- Proprely Admin — Database Schema
-- Run order: schema.sql → profiles.sql → audit_logs.sql → rls.sql → seed.sql

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── updated_at trigger helper (used by every business table) ────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Companies (tenants) ─────────────────────────────────────────────────────
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Leads ───────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,  -- FK added in profiles.sql to avoid circular dep
  company_name TEXT NOT NULL,
  sector TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  source TEXT,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  probable_need TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','qualifie','a_contacter','contacte','converti','rejete')),
  notes TEXT,
  converted_opportunity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Opportunities ───────────────────────────────────────────────────────────
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
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
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','prise_de_contact','decouverte','proposition','negociation','gagnee','perdue')),
  next_action_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ouvert',
  converted_to_client BOOLEAN NOT NULL DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Clients ─────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Sites ───────────────────────────────────────────────────────────────────
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER sites_set_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SOPs ────────────────────────────────────────────────────────────────────
CREATE TABLE sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  title TEXT NOT NULL,
  service_type TEXT,
  estimated_duration_minutes INTEGER,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  required_materials TEXT[] NOT NULL DEFAULT '{}',
  required_products TEXT[] NOT NULL DEFAULT '{}',
  checklist_items JSONB NOT NULL DEFAULT '[]',
  safety_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER sops_set_updated_at BEFORE UPDATE ON sops FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Agents ──────────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialty TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  business_registration_number TEXT,
  contract_type TEXT NOT NULL DEFAULT 'cdi' CHECK (contract_type IN ('auto_entrepreneur','cdd','cdi','extra','sous_traitant')),
  weekly_availability_hours INTEGER NOT NULL DEFAULT 35,
  weekly_availability JSONB NOT NULL DEFAULT '{}',
  zone TEXT,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','occupe','absent','inactif')),
  hourly_cost NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER agents_set_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Operational items (cockpit) ─────────────────────────────────────────────
CREATE TABLE operational_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  opportunity_id UUID REFERENCES opportunities(id),
  source TEXT NOT NULL DEFAULT 'contrat',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_organiser' CHECK (status IN ('a_organiser','en_cours','planifie','annule')),
  priority TEXT NOT NULL DEFAULT 'normale',
  notes TEXT,
  converted_to_mission BOOLEAN NOT NULL DEFAULT FALSE,
  mission_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER operational_items_set_updated_at BEFORE UPDATE ON operational_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Missions ────────────────────────────────────────────────────────────────
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  operational_item_id UUID REFERENCES operational_items(id),
  service_type TEXT,
  sop_id UUID REFERENCES sops(id),
  status TEXT NOT NULL DEFAULT 'prevue' CHECK (status IN ('prevue','en_cours','terminee','a_valider','probleme_signale','annulee')),
  scheduled_date DATE NOT NULL,
  start_time TIME,
  planned_hours NUMERIC(5,2) NOT NULL DEFAULT 2,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER missions_set_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Mission ↔ Agents (N:N) ──────────────────────────────────────────────────
CREATE TABLE mission_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mission_id, agent_id)
);

-- ─── Time entries ────────────────────────────────────────────────────────────
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  mission_id UUID NOT NULL REFERENCES missions(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  date DATE NOT NULL,
  planned_hours NUMERIC(5,2) NOT NULL,
  validated_hours NUMERIC(5,2),
  hourly_cost NUMERIC(8,2),
  total_cost NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'prevue' CHECK (status IN ('prevue','a_valider','validee','corrigee')),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER time_entries_set_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Service types ───────────────────────────────────────────────────────────
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID,
  name TEXT NOT NULL,
  estimated_duration_minutes INTEGER,
  indicative_price NUMERIC(10,2),
  default_sop_id UUID REFERENCES sops(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER service_types_set_updated_at BEFORE UPDATE ON service_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Indexes (every read path the UI hits) ───────────────────────────────────
CREATE INDEX idx_leads_company_status            ON leads(company_id, status);
CREATE INDEX idx_opportunities_company_stage     ON opportunities(company_id, stage);
CREATE INDEX idx_clients_company                 ON clients(company_id);
CREATE INDEX idx_sites_company                   ON sites(company_id);
CREATE INDEX idx_sites_client                    ON sites(client_id);
CREATE INDEX idx_agents_company_status           ON agents(company_id, status);
CREATE INDEX idx_sops_company                    ON sops(company_id);
CREATE INDEX idx_operational_items_company_stat  ON operational_items(company_id, status);
CREATE INDEX idx_missions_company_date           ON missions(company_id, scheduled_date);
CREATE INDEX idx_missions_company_status         ON missions(company_id, status);
CREATE INDEX idx_mission_agents_mission          ON mission_agents(mission_id);
CREATE INDEX idx_mission_agents_agent            ON mission_agents(agent_id);
CREATE INDEX idx_time_entries_company_date       ON time_entries(company_id, date);
CREATE INDEX idx_time_entries_agent              ON time_entries(agent_id);
CREATE INDEX idx_service_types_company           ON service_types(company_id);
