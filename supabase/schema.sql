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

-- Indexes
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_sites_client ON sites(client_id);
CREATE INDEX idx_agents_company ON agents(company_id);
CREATE INDEX idx_missions_scheduled_date ON missions(scheduled_date);
CREATE INDEX idx_missions_company ON missions(company_id);
CREATE INDEX idx_time_entries_agent ON time_entries(agent_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);

-- ============================================================
-- MULTI-TENANT: Users, RLS, Policies, Triggers
-- ============================================================

-- Users table (links Supabase auth.users to companies)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager', 'sales', 'agent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_company ON users(company_id);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the company_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- companies: users can only read their own company
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (id = get_user_company_id());

-- users: read own record and others in same company; update own record only
CREATE POLICY "users_select" ON users
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- leads
CREATE POLICY "leads_select" ON leads FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (company_id = get_user_company_id());

-- opportunities
CREATE POLICY "opportunities_select" ON opportunities FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE USING (company_id = get_user_company_id());

-- clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (company_id = get_user_company_id());

-- sites
CREATE POLICY "sites_select" ON sites FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "sites_insert" ON sites FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "sites_update" ON sites FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "sites_delete" ON sites FOR DELETE USING (company_id = get_user_company_id());

-- sops
CREATE POLICY "sops_select" ON sops FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "sops_insert" ON sops FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "sops_update" ON sops FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "sops_delete" ON sops FOR DELETE USING (company_id = get_user_company_id());

-- agents
CREATE POLICY "agents_select" ON agents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "agents_delete" ON agents FOR DELETE USING (company_id = get_user_company_id());

-- operational_items
CREATE POLICY "operational_items_select" ON operational_items FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "operational_items_insert" ON operational_items FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "operational_items_update" ON operational_items FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "operational_items_delete" ON operational_items FOR DELETE USING (company_id = get_user_company_id());

-- missions
CREATE POLICY "missions_select" ON missions FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "missions_insert" ON missions FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "missions_update" ON missions FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "missions_delete" ON missions FOR DELETE USING (company_id = get_user_company_id());

-- mission_agents: access via mission's company_id join
CREATE POLICY "mission_agents_select" ON mission_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_agents.mission_id
        AND m.company_id = get_user_company_id()
    )
  );
CREATE POLICY "mission_agents_insert" ON mission_agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_agents.mission_id
        AND m.company_id = get_user_company_id()
    )
  );
CREATE POLICY "mission_agents_update" ON mission_agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_agents.mission_id
        AND m.company_id = get_user_company_id()
    )
  );
CREATE POLICY "mission_agents_delete" ON mission_agents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_agents.mission_id
        AND m.company_id = get_user_company_id()
    )
  );

-- time_entries
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "time_entries_insert" ON time_entries FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "time_entries_update" ON time_entries FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "time_entries_delete" ON time_entries FOR DELETE USING (company_id = get_user_company_id());

-- service_types
CREATE POLICY "service_types_select" ON service_types FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "service_types_insert" ON service_types FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "service_types_update" ON service_types FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "service_types_delete" ON service_types FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================
-- TRIGGER: auto-create user record after signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- company_id comes from user metadata set during signup
  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
