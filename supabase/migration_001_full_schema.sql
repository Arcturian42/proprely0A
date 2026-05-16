-- ============================================================
-- MIGRATION 001 — Full PRD Schema
-- Run this in Supabase SQL Editor AFTER the base schema.sql
-- Safe to run: only ADDs columns and tables, never drops
-- ============================================================

-- ─── 1. EXTEND EXISTING TABLES ───────────────────────────────

-- companies: add SaaS/billing fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- users: add profile fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- all operational tables: add created_by where missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ─── 2. NEW TABLES ───────────────────────────────────────────

-- Subscriptions (Stripe billing lifecycle)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused')),
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

-- Audit logs (immutable write log)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  record_type TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_type, record_id);

-- Lead events (activity log per lead)
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);

-- Mission requirements (products/materials/equipment per mission)
CREATE TABLE IF NOT EXISTS mission_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'material', 'equipment')),
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,2),
  source TEXT,
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mission_requirements_mission ON mission_requirements(mission_id);

-- Mission status logs (audit trail for status changes)
CREATE TABLE IF NOT EXISTS mission_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mission_status_logs_mission ON mission_status_logs(mission_id);

-- Mission costs (labor, products, travel, etc.)
CREATE TABLE IF NOT EXISTS mission_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('labor', 'product', 'travel', 'equipment', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mission_costs_mission ON mission_costs(mission_id);

-- Agent skills (normalized, replaces skills[] array)
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL CHECK (skill_category IN ('office', 'medical', 'windows', 'carpet', 'industrial', 'special')),
  UNIQUE(agent_id, skill_category)
);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);

-- Agent availability (weekly schedule)
CREATE TABLE IF NOT EXISTS agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(agent_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_agent_availability_agent ON agent_availability(agent_id);

-- Agent contracts
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
CREATE INDEX IF NOT EXISTS idx_agent_contracts_agent ON agent_contracts(agent_id);

-- Payroll adjustments (bonus, correction, overtime)
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'correction', 'overtime')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_agent ON payroll_adjustments(agent_id);

-- SOP steps (normalized, replaces checklist_items JSONB)
CREATE TABLE IF NOT EXISTS sop_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  UNIQUE(sop_id, step_order)
);
CREATE INDEX IF NOT EXISTS idx_sop_steps_sop ON sop_steps(sop_id);

-- SOP products
CREATE TABLE IF NOT EXISTS sop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT
);
CREATE INDEX IF NOT EXISTS idx_sop_products_sop ON sop_products(sop_id);

-- SOP materials
CREATE TABLE IF NOT EXISTS sop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  specification TEXT
);
CREATE INDEX IF NOT EXISTS idx_sop_materials_sop ON sop_materials(sop_id);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  site_id UUID REFERENCES sites(id),
  service_type TEXT,
  total_cost NUMERIC(10,2),
  margin_amount NUMERIC(10,2),
  selling_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id);

-- Quote items
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('labor', 'product', 'travel', 'equipment', 'margin')),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('client', 'site', 'mission', 'agent')),
  record_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('contract', 'insurance', 'photo', 'report', 'invoice', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_record ON documents(record_type, record_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT,
  record_type TEXT,
  record_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- Profitability snapshots
CREATE TABLE IF NOT EXISTS profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('client', 'site', 'mission')),
  record_id UUID NOT NULL,
  period TEXT NOT NULL,
  revenue NUMERIC(12,2),
  total_cost NUMERIC(12,2),
  margin NUMERIC(12,2),
  margin_pct NUMERIC(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profitability_company ON profitability_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_profitability_record ON profitability_snapshots(record_type, record_id);

-- ─── 3. RLS ON NEW TABLES ────────────────────────────────────

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

-- subscriptions
CREATE POLICY "subscriptions_all" ON subscriptions FOR ALL USING (company_id = get_user_company_id());

-- audit_logs (read-only for users, written by system)
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- lead_events: via lead's company
CREATE POLICY "lead_events_all" ON lead_events FOR ALL
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_events.lead_id AND leads.company_id = get_user_company_id()));

-- mission_requirements: via mission's company
CREATE POLICY "mission_requirements_all" ON mission_requirements FOR ALL
  USING (EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_requirements.mission_id AND missions.company_id = get_user_company_id()));

-- mission_status_logs: via mission's company
CREATE POLICY "mission_status_logs_all" ON mission_status_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_status_logs.mission_id AND missions.company_id = get_user_company_id()));

-- mission_costs: via mission's company
CREATE POLICY "mission_costs_all" ON mission_costs FOR ALL
  USING (EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_costs.mission_id AND missions.company_id = get_user_company_id()));

-- agent_skills: via agent's company
CREATE POLICY "agent_skills_all" ON agent_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_skills.agent_id AND agents.company_id = get_user_company_id()));

-- agent_availability: via agent's company
CREATE POLICY "agent_availability_all" ON agent_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_availability.agent_id AND agents.company_id = get_user_company_id()));

-- agent_contracts: via agent's company
CREATE POLICY "agent_contracts_all" ON agent_contracts FOR ALL
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_contracts.agent_id AND agents.company_id = get_user_company_id()));

-- payroll_adjustments: via agent's company
CREATE POLICY "payroll_adjustments_all" ON payroll_adjustments FOR ALL
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = payroll_adjustments.agent_id AND agents.company_id = get_user_company_id()));

-- sop_steps: via sop's company
CREATE POLICY "sop_steps_all" ON sop_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM sops WHERE sops.id = sop_steps.sop_id AND sops.company_id = get_user_company_id()));

-- sop_products: via sop's company
CREATE POLICY "sop_products_all" ON sop_products FOR ALL
  USING (EXISTS (SELECT 1 FROM sops WHERE sops.id = sop_products.sop_id AND sops.company_id = get_user_company_id()));

-- sop_materials: via sop's company
CREATE POLICY "sop_materials_all" ON sop_materials FOR ALL
  USING (EXISTS (SELECT 1 FROM sops WHERE sops.id = sop_materials.sop_id AND sops.company_id = get_user_company_id()));

-- quotes
CREATE POLICY "quotes_all" ON quotes FOR ALL USING (company_id = get_user_company_id());

-- quote_items: via quote's company
CREATE POLICY "quote_items_all" ON quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.company_id = get_user_company_id()));

-- documents
CREATE POLICY "documents_all" ON documents FOR ALL USING (company_id = get_user_company_id());

-- notifications: user sees only their own
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR (user_id IS NULL AND company_id = get_user_company_id()));
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- profitability_snapshots
CREATE POLICY "profitability_snapshots_all" ON profitability_snapshots FOR ALL USING (company_id = get_user_company_id());
