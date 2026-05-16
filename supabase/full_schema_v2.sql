-- ============================================================
-- PROPRELY — Full Schema v2
-- Run this in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ─── CORE TABLES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  siret TEXT,
  country TEXT DEFAULT 'FR',
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'sales', 'agent')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- ─── HELPER FUNCTION (needed for RLS policies) ───────────────

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── OPERATIONAL TABLES ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
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
  status TEXT NOT NULL DEFAULT 'nouveau',
  notes TEXT,
  converted_opportunity_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

CREATE TABLE IF NOT EXISTS opportunities (
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
  stage TEXT NOT NULL DEFAULT 'lead',
  next_action_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ouvert',
  converted_to_client BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);

CREATE TABLE IF NOT EXISTS clients (
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
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);

CREATE TABLE IF NOT EXISTS sites (
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
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sites_client ON sites(client_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);

CREATE TABLE IF NOT EXISTS sops (
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
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sops_company ON sops(company_id);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialty TEXT,
  skills TEXT[] DEFAULT '{}',
  business_registration_number TEXT,
  contract_type TEXT NOT NULL DEFAULT 'cdi',
  weekly_availability_hours INTEGER DEFAULT 35,
  weekly_availability JSONB DEFAULT '{}',
  zone TEXT,
  status TEXT NOT NULL DEFAULT 'disponible',
  hourly_cost NUMERIC(8,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);

CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estimated_duration_minutes INTEGER,
  indicative_price NUMERIC(10,2),
  default_sop_id UUID REFERENCES sops(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_types_company ON service_types(company_id);

CREATE TABLE IF NOT EXISTS operational_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  opportunity_id UUID REFERENCES opportunities(id),
  source TEXT NOT NULL DEFAULT 'contrat',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_organiser',
  priority TEXT NOT NULL DEFAULT 'normale',
  notes TEXT,
  converted_to_mission BOOLEAN DEFAULT FALSE,
  mission_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_items_company ON operational_items(company_id);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  operational_item_id UUID REFERENCES operational_items(id),
  service_type TEXT,
  sop_id UUID REFERENCES sops(id),
  status TEXT NOT NULL DEFAULT 'prevue',
  scheduled_date DATE NOT NULL,
  start_time TIME,
  planned_hours NUMERIC(5,2) NOT NULL DEFAULT 2,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normale',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_missions_scheduled_date ON missions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_missions_company ON missions(company_id);

CREATE TABLE IF NOT EXISTS mission_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, agent_id)
);

CREATE TABLE IF NOT EXISTS time_entries (
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
  status TEXT NOT NULL DEFAULT 'prevue',
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_agent ON time_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(company_id);

-- ─── PRD ADDITIONAL TABLES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'trialing',
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);

CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);

CREATE TABLE IF NOT EXISTS mission_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,2),
  source TEXT,
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL,
  UNIQUE(agent_id, skill_category)
);

CREATE TABLE IF NOT EXISTS agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(agent_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS agent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  hourly_rate NUMERIC(8,2),
  weekly_hours NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'correction', 'overtime')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sop_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  UNIQUE(sop_id, step_order)
);

CREATE TABLE IF NOT EXISTS sop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT
);

CREATE TABLE IF NOT EXISTS sop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  specification TEXT
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  site_id UUID REFERENCES sites(id),
  service_type TEXT,
  total_cost NUMERIC(10,2),
  margin_amount NUMERIC(10,2),
  selling_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  record_type TEXT,
  record_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

CREATE TABLE IF NOT EXISTS profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  period TEXT NOT NULL,
  revenue NUMERIC(12,2),
  total_cost NUMERIC(12,2),
  margin NUMERIC(12,2),
  margin_pct NUMERIC(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profitability_company ON profitability_snapshots(company_id);

-- ─── ENABLE RLS ──────────────────────────────────────────────

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profitability_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ────────────────────────────────────────────

-- Drop existing policies first (safe re-run)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- companies
CREATE POLICY "companies_select" ON companies FOR SELECT USING (id = get_user_company_id());
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (id = get_user_company_id());

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true); -- needed for trigger
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = auth.uid());

-- simple company-scoped tables
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'leads','opportunities','clients','sites','sops','agents',
    'service_types','operational_items','missions','time_entries',
    'subscriptions','quotes','documents','profitability_snapshots'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (company_id = get_user_company_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (company_id = get_user_company_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (company_id = get_user_company_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (company_id = get_user_company_id())', tbl, tbl);
  END LOOP;
END $$;

-- audit_logs (insert only, no delete)
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- mission_agents
CREATE POLICY "mission_agents_all" ON mission_agents FOR ALL
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_agents.mission_id AND m.company_id = get_user_company_id()));

-- mission_requirements
CREATE POLICY "mission_requirements_all" ON mission_requirements FOR ALL
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_requirements.mission_id AND m.company_id = get_user_company_id()));

-- mission_status_logs
CREATE POLICY "mission_status_logs_all" ON mission_status_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_status_logs.mission_id AND m.company_id = get_user_company_id()));

-- mission_costs
CREATE POLICY "mission_costs_all" ON mission_costs FOR ALL
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_costs.mission_id AND m.company_id = get_user_company_id()));

-- lead_events
CREATE POLICY "lead_events_all" ON lead_events FOR ALL
  USING (EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_events.lead_id AND l.company_id = get_user_company_id()));

-- agent sub-tables
CREATE POLICY "agent_skills_all" ON agent_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_skills.agent_id AND a.company_id = get_user_company_id()));
CREATE POLICY "agent_availability_all" ON agent_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_availability.agent_id AND a.company_id = get_user_company_id()));
CREATE POLICY "agent_contracts_all" ON agent_contracts FOR ALL
  USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_contracts.agent_id AND a.company_id = get_user_company_id()));
CREATE POLICY "payroll_adjustments_all" ON payroll_adjustments FOR ALL
  USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = payroll_adjustments.agent_id AND a.company_id = get_user_company_id()));

-- sop sub-tables
CREATE POLICY "sop_steps_all" ON sop_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM sops s WHERE s.id = sop_steps.sop_id AND s.company_id = get_user_company_id()));
CREATE POLICY "sop_products_all" ON sop_products FOR ALL
  USING (EXISTS (SELECT 1 FROM sops s WHERE s.id = sop_products.sop_id AND s.company_id = get_user_company_id()));
CREATE POLICY "sop_materials_all" ON sop_materials FOR ALL
  USING (EXISTS (SELECT 1 FROM sops s WHERE s.id = sop_materials.sop_id AND s.company_id = get_user_company_id()));

-- quote_items
CREATE POLICY "quote_items_all" ON quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.company_id = get_user_company_id()));

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR (user_id IS NULL AND company_id = get_user_company_id()));
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ─── TRIGGER: auto-create user row on signup ─────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
