-- P2.4 / BUG-MAJ-06 — Persistent per-company quote numbering.
--
-- Before this migration, src/components/commercial/QuoteFlow.tsx generated
-- quote_number with `DEV-${Date.now().toString().slice(-6)}`. The 6-character
-- suffix from a millisecond timestamp collides easily (only ~1M unique values
-- across the rolling 16-minute window where slice(-6) loops). Two reps
-- drafting quotes in the same second on the same company could end up with
-- the same number, which then breaks the comptabilité audit trail.
--
-- This replaces that with a real per-company-per-year counter, accessed via
-- an atomic RPC. Format: DEV-YYYY-NNNN (DEV-2026-0001 …).
--
-- Idempotent — safe to re-run.

-- Counter table -------------------------------------------------------------
-- One row per (company_id, year). The RPC below upserts and increments in a
-- single statement so concurrent quote creations don't race.
CREATE TABLE IF NOT EXISTS quote_counters (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year       INTEGER NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, year)
);

ALTER TABLE quote_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_counters_tenant ON quote_counters;
CREATE POLICY quote_counters_tenant ON quote_counters
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());

-- RPC -----------------------------------------------------------------------
-- Returns the next quote number for the caller's company, like 'DEV-2026-0042'.
-- Atomic via INSERT ... ON CONFLICT DO UPDATE — Postgres locks the row, so
-- two concurrent calls get two consecutive numbers (no gap, no duplicate).
--
-- SECURITY DEFINER so the function runs with the schema owner's rights, but
-- we still gate it on current_company_id() to keep tenants isolated.
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := current_company_id();
  v_year       INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_next       INTEGER;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'generate_quote_number: no company context (auth required)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO quote_counters (company_id, year, last_value, updated_at)
  VALUES (v_company_id, v_year, 1, NOW())
  ON CONFLICT (company_id, year)
  DO UPDATE SET
    last_value = quote_counters.last_value + 1,
    updated_at = NOW()
  RETURNING last_value INTO v_next;

  -- Format: DEV-2026-0042 (zero-padded to 4 digits — fits ~10k/year/company).
  RETURN 'DEV-' || v_year::TEXT || '-' || LPAD(v_next::TEXT, 4, '0');
END $$;

REVOKE ALL ON FUNCTION generate_quote_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_quote_number() TO authenticated;

-- Force PostgREST to pick up the new function immediately.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
