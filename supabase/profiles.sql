-- Profiles — 1:1 with auth.users, scoped to a single company + role.
-- Run AFTER schema.sql. Idempotent: safe to re-run after a partial failure.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'owner', 'admin', 'sales', 'ops_manager', 'accountant', 'agent', 'viewer'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
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
DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- `created_by` columns are not present on the business tables in schema.sql.
-- We add them as nullable, then wire the FK to profiles. ON DELETE SET NULL
-- so deleting a user doesn't cascade-delete their work.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'leads','opportunities','clients','sites','sops','agents',
    'operational_items','missions','time_entries','service_types'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by UUID', t);
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      t, t || '_created_by_fkey'
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL',
      t, t || '_created_by_fkey'
    );
  END LOOP;
END $$;

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

-- Renamed from current_role() — that name collides with a built-in
-- PostgreSQL keyword and is rejected by the parser without quoting.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;
