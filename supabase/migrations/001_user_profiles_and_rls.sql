-- Migration 001: User profiles + Row Level Security
-- Run this in the Supabase SQL editor if the base schema already exists.

-- ─── User profiles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

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

-- ─── Helper function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Policies ─────────────────────────────────────────────────────────────────

-- Drop existing policies if any (safe to re-run)
DO $$ BEGIN
  DROP POLICY IF EXISTS "company_isolation" ON companies;
  DROP POLICY IF EXISTS "profile_self" ON user_profiles;
  DROP POLICY IF EXISTS "company_isolation" ON leads;
  DROP POLICY IF EXISTS "company_isolation" ON opportunities;
  DROP POLICY IF EXISTS "company_isolation" ON clients;
  DROP POLICY IF EXISTS "company_isolation" ON sites;
  DROP POLICY IF EXISTS "company_isolation" ON agents;
  DROP POLICY IF EXISTS "company_isolation" ON sops;
  DROP POLICY IF EXISTS "company_isolation" ON operational_items;
  DROP POLICY IF EXISTS "company_isolation" ON missions;
  DROP POLICY IF EXISTS "company_isolation" ON time_entries;
  DROP POLICY IF EXISTS "company_isolation" ON service_types;
  DROP POLICY IF EXISTS "mission_agents_isolation" ON mission_agents;
END $$;

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
