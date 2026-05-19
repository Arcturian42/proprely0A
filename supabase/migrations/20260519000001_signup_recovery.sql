-- BUG-001 (audit 19 mai 2026) — defensive re-run of the onboarding scaffolding
-- so any environment that missed an earlier migration ends up consistent.
--
-- Symptoms observed in production:
--   * Signup fails with "Could not find the table 'public.onboarding_status'
--     in the schema cache".
--   * Magic-link users sometimes end up with an auth.users row but no profile
--     (server actions then return "Profil introuvable"). The application now
--     auto-recovers via ensureProfileForCurrentUser(), but the recovery needs
--     onboarding_status / company_pricing_settings to exist.
--
-- This migration:
--   1. Re-creates onboarding_status / company_pricing_settings minimally if
--      they were never created (CREATE TABLE IF NOT EXISTS only — full
--      schema lives in 20260518000000 / 20260518000003).
--   2. Backfills the rows for every existing company so the wizard's upsert
--      always finds a target.
--   3. Forces a PostgREST schema-cache reload (`NOTIFY pgrst, 'reload schema'`)
--      so deployments don't keep serving 404 on freshly-created tables.
--
-- Idempotent — safe to re-run.

-- 1. Tables (no-op when 20260518000000 / 20260518000003 already ran)
CREATE TABLE IF NOT EXISTS onboarding_status (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  step_1_completed_at          TIMESTAMPTZ,
  step_2_team_completed_at     TIMESTAMPTZ,
  step_2_team_skipped_at       TIMESTAMPTZ,
  step_3_services_completed_at TIMESTAMPTZ,
  step_3_services_skipped_at   TIMESTAMPTZ,
  step_4_pricing_completed_at  TIMESTAMPTZ,
  step_4_pricing_skipped_at    TIMESTAMPTZ,
  step_5_settings_completed_at TIMESTAMPTZ,
  step_5_settings_skipped_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_status_tenant ON onboarding_status;
CREATE POLICY onboarding_status_tenant ON onboarding_status
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());

-- 2. Backfill any company that was created between migrations being applied.
INSERT INTO onboarding_status (
  company_id,
  step_1_completed_at,
  step_2_team_skipped_at,
  step_3_services_skipped_at,
  step_4_pricing_skipped_at,
  step_5_settings_skipped_at,
  completed_at
)
SELECT id, created_at, created_at, created_at, created_at, created_at, created_at
FROM companies
WHERE id NOT IN (SELECT company_id FROM onboarding_status)
ON CONFLICT (company_id) DO NOTHING;

-- Mirror for company_pricing_settings — same reason (signUpCompany inserts here).
-- Wrapped in DO $$ so a totally absent table (older env that skipped
-- 20260518000003) doesn't abort this whole migration: signup_recovery's
-- primary job is to get onboarding_status back, and the app is now resilient
-- to a missing company_pricing_settings (the insert in signUpCompany is
-- non-fatal as of the same audit fix).
DO $$
BEGIN
  INSERT INTO company_pricing_settings (company_id)
  SELECT id FROM companies
  WHERE id NOT IN (SELECT company_id FROM company_pricing_settings)
  ON CONFLICT (company_id) DO NOTHING;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'company_pricing_settings missing; re-run 20260518000003 manually';
END $$;

-- 3. Force PostgREST to refresh its schema cache so the table is visible to
--    the REST API even if the previous deploy is still warm.
--    Supabase listens on the `pgrst` channel and reloads on this notify.
DO $$
BEGIN
  -- pg_notify exists on all supported Postgres versions; guard anyway.
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- Best-effort. If the channel doesn't exist (managed Postgres outside
  -- Supabase), we don't want the migration to fail.
  NULL;
END $$;
