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

-- User profiles (links auth.users to companies)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Helper function to get company_id for current user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies: users only see their company's data
CREATE POLICY "company_isolation" ON companies
  FOR ALL USING (id = get_user_company_id());

CREATE POLICY "profile_self" ON user_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "company_isolation" ON leads
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON opportunities
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON clients
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON sites
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON agents
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON sops
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON operational_items
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON missions
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON time_entries
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_isolation" ON service_types
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "mission_agents_isolation" ON mission_agents
  FOR ALL USING (
    mission_id IN (SELECT id FROM missions WHERE company_id = get_user_company_id())
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
