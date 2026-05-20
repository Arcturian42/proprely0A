-- BUG-001 root cause (finally) — 20 mai 2026
--
-- Supabase Studio diagnostic on production revealed that NONE of these
-- migrations have ever been applied via the migrations system : the schema
-- `supabase_migrations.schema_migrations` doesn't exist on prod. The tables
-- were created by some other means (Studio SQL editor / `supabase db push`
-- without metadata / ad-hoc script). Side-effect : the standard Supabase
-- table-level GRANTs that ship when tables are created via the Studio path
-- were never granted.
--
-- Result : `service_role` has BYPASSRLS but has NO privileges on the public
-- tables. Even though RLS is bypassed, the raw SQL-level permission check
-- fires first :
--
--   ERROR 42501: permission denied for table companies
--
-- That's the actual error every signUpCompany was throwing. The UI showed
-- "Action refusée" because RLS_PATTERN in user-message.ts matches both
-- "row-level security" AND "permission denied for" — they look the same to
-- the user, but they have completely different root causes.
--
-- This migration restores the Supabase-default GRANTs for all three runtime
-- roles (service_role, authenticated, anon) on every existing table in
-- public, plus the ALTER DEFAULT PRIVILEGES so future tables get them too.
--
-- Idempotent : GRANT is a no-op when the privilege is already held.
-- Safe to re-run on every environment.

-- ─── 1. Existing public tables ────────────────────────────────────────────

-- service_role : full access (BYPASSRLS lets it ignore policies, but it
-- still needs the underlying SQL privilege to touch the table).
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- authenticated : standard CRUD ; RLS policies do the actual gating.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- anon : read-only by default (RLS filters what they can actually see).
-- Most app paths require authenticated, but a few public-page reads may go
-- through anon (e.g. /cgu /confidentialite static pages don't hit Postgres,
-- but the signup form's pre-flight uses service_role so anon stays minimal).
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Schema-level USAGE so the roles can resolve `public.<table>` at all.
GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;

-- ─── 2. ALTER DEFAULT PRIVILEGES for future objects ───────────────────────
-- These statements set the privileges that will be auto-granted when a new
-- table/sequence/function is created BY THE ROLE running this migration
-- (typically postgres). Mirrors what Supabase does on a fresh project.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon;

-- ─── 3. PostgREST schema cache reload ─────────────────────────────────────
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
