-- Row-Level Security — every business table is scoped to current_company_id().
-- Runs after profiles so the helper functions exist.
--
-- Pattern: same policy for SELECT/INSERT/UPDATE/DELETE on each table.
-- Role-based restrictions (e.g. "viewer can't write") live in the app layer
-- via the RBAC matrix in src/lib/auth/rbac.ts — RLS only enforces tenant
-- isolation, not feature permissions. This keeps policies fast and auditable.
--
-- Idempotent: ALTER … ENABLE RLS is a no-op when already on, and every
-- CREATE POLICY is preceded by DROP POLICY IF EXISTS so re-runs don't error.

ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_agents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types      ENABLE ROW LEVEL SECURITY;

-- ─── companies: you can read your own row, owner can update it ───────────────
DROP POLICY IF EXISTS companies_select ON companies;
CREATE POLICY companies_select ON companies
  FOR SELECT USING (id = current_company_id());
DROP POLICY IF EXISTS companies_update ON companies;
CREATE POLICY companies_update ON companies
  FOR UPDATE USING (id = current_company_id() AND current_user_role() = 'owner');

-- ─── profiles: read peers in your company, only owner/admin can write ────────
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (company_id = current_company_id());
DROP POLICY IF EXISTS profiles_write ON profiles;
CREATE POLICY profiles_write ON profiles
  FOR ALL USING (company_id = current_company_id() AND current_user_role() IN ('owner','admin'))
            WITH CHECK (company_id = current_company_id() AND current_user_role() IN ('owner','admin'));

-- ─── Tenant-scoped tables: same shape, same policy ──────────────────────────
DROP POLICY IF EXISTS leads_tenant ON leads;
CREATE POLICY leads_tenant              ON leads             FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS opportunities_tenant ON opportunities;
CREATE POLICY opportunities_tenant      ON opportunities     FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS clients_tenant ON clients;
CREATE POLICY clients_tenant            ON clients           FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS sites_tenant ON sites;
CREATE POLICY sites_tenant              ON sites             FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS sops_tenant ON sops;
CREATE POLICY sops_tenant               ON sops              FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS agents_tenant ON agents;
CREATE POLICY agents_tenant             ON agents            FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS operational_items_tenant ON operational_items;
CREATE POLICY operational_items_tenant  ON operational_items FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS missions_tenant ON missions;
CREATE POLICY missions_tenant           ON missions          FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS time_entries_tenant ON time_entries;
CREATE POLICY time_entries_tenant       ON time_entries      FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS service_types_tenant ON service_types;
CREATE POLICY service_types_tenant      ON service_types     FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

-- mission_agents is a join table — scope via the parent mission.
DROP POLICY IF EXISTS mission_agents_tenant ON mission_agents;
CREATE POLICY mission_agents_tenant ON mission_agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.company_id = current_company_id())
  );
