-- BUG-001 reocurrence (20 mai 2026) — production signup fails with
-- "Service temporairement indisponible (mise à jour en cours)" because the
-- PostgREST schema cache is stale after 20260520000004_rls_force_and_audit_extend
-- ran. The recent migrations (FORCE RLS, notifications table, quote_counters)
-- can leave the cached schema served at /rest/v1/ out of sync until PostgREST
-- gets a NOTIFY signal or is restarted.
--
-- This migration does two things:
--   1. Sanity-checks the existence of the 4 tables the signUpCompany action
--      touches. Uses RAISE NOTICE (not EXCEPTION) so a missing table doesn't
--      abort the deploy — operators see the signal in the migration log and
--      can act, but later migrations still run.
--   2. Forces PostgREST to reload its schema cache so newly-created tables and
--      columns become visible to the REST API immediately.
--
-- Idempotent — safe to re-run as a standalone fix when production hits the
-- same symptom again.

DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    missing_tables := missing_tables || 'profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    missing_tables := missing_tables || 'companies';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'onboarding_status'
  ) THEN
    missing_tables := missing_tables || 'onboarding_status';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_pricing_settings'
  ) THEN
    missing_tables := missing_tables || 'company_pricing_settings';
  END IF;

  IF array_length(missing_tables, 1) IS NOT NULL THEN
    RAISE NOTICE 'signUpCompany dependencies missing — re-run earlier migrations: %', missing_tables;
  END IF;
END $$;

-- Force PostgREST to refresh its schema cache. Supabase listens on the `pgrst`
-- channel and reloads on this notify. Wrapped in DO so a managed Postgres
-- without the channel doesn't fail the migration.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
