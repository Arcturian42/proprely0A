-- Profiles — 1:1 with auth.users, scoped to a single company + role.
-- Run AFTER schema.sql.

CREATE TYPE user_role AS ENUM (
  'owner', 'admin', 'sales', 'ops_manager', 'accountant', 'agent', 'viewer'
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_profiles_company ON profiles(company_id);

-- Wire created_by FKs now that profiles exists.
ALTER TABLE leads              ADD CONSTRAINT leads_created_by_fkey              FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE opportunities      ADD CONSTRAINT opportunities_created_by_fkey      FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE clients            ADD CONSTRAINT clients_created_by_fkey            FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE sites              ADD CONSTRAINT sites_created_by_fkey              FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE sops               ADD CONSTRAINT sops_created_by_fkey               FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE agents             ADD CONSTRAINT agents_created_by_fkey             FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE operational_items  ADD CONSTRAINT operational_items_created_by_fkey  FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE missions           ADD CONSTRAINT missions_created_by_fkey           FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE time_entries       ADD CONSTRAINT time_entries_created_by_fkey       FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE service_types      ADD CONSTRAINT service_types_created_by_fkey      FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Helper used by every RLS policy. Stable + immutable for plan caching.
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION current_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;
