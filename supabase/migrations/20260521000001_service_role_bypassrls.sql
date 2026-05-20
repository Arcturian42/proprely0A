-- BUG-001 final fix (20 mai 2026) — the user kept hitting RLS errors on
-- signUpCompany despite the schema-cache reload migration. With the
-- toUserMessage fix landing, we finally saw the real error:
--
--   "new row violates row-level security policy"
--
-- That can only happen if the service_role doing the INSERT does NOT bypass
-- RLS — which means service_role is missing the BYPASSRLS attribute on this
-- environment. In Supabase Cloud, service_role gets BYPASSRLS by default,
-- but the attribute can be lost (manual `ALTER ROLE service_role NOBYPASSRLS`
-- run somewhere, or a custom self-hosted setup that never granted it).
--
-- Compounding factor: 20260520000004 applied FORCE ROW LEVEL SECURITY to
-- companies + profiles. FORCE only affects table owners, so it shouldn't
-- impact a BYPASSRLS role — but with BYPASSRLS missing AND no INSERT policy
-- on companies, every signup INSERT was guaranteed to fail.
--
-- Idempotent : if service_role already has BYPASSRLS, ALTER ROLE is a no-op.
--
-- Wrapped in DO so a self-hosted environment where `service_role` doesn't
-- exist (managed Postgres outside Supabase) doesn't fail the migration.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    ALTER ROLE service_role BYPASSRLS;
    RAISE NOTICE 'service_role granted BYPASSRLS';
  ELSE
    RAISE NOTICE 'service_role role does not exist — skipping (non-Supabase env?)';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  -- Some managed Postgres providers run migrations as a non-superuser that
  -- can't alter system roles. Surface clearly without failing the deploy —
  -- operator has to fix via the Supabase dashboard SQL editor manually:
  --   ALTER ROLE service_role BYPASSRLS;
  RAISE WARNING 'Migration role lacks privilege to ALTER ROLE service_role. Run manually as superuser: ALTER ROLE service_role BYPASSRLS;';
END $$;

-- Force PostgREST to reload its grant cache so the change takes effect on the
-- next request without waiting for a process restart.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
