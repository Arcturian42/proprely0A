-- Mission recurrence — describes how a parent mission template spawns
-- repeating child missions (weekly cleaning, monthly window wash, etc.).
-- Children are regular `missions` rows with `recurrence_id` pointing back
-- to their template; the cron job (Vercel Cron, hourly) reads pending
-- templates and creates the next missions in the window.
--
-- Idempotent — safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_frequency') THEN
    CREATE TYPE recurrence_frequency AS ENUM (
      'weekly',
      'biweekly',
      'monthly'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mission_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,

  -- What gets repeated
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  service_type TEXT,
  planned_hours NUMERIC(5,2),
  start_time TIME,
  default_agent_ids UUID[] DEFAULT '{}',

  -- When it repeats
  frequency recurrence_frequency NOT NULL DEFAULT 'weekly',
  weekday SMALLINT CHECK (weekday IS NULL OR (weekday BETWEEN 0 AND 6)),
  day_of_month SMALLINT CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),

  -- Window of activity
  starts_on DATE NOT NULL,
  ends_on DATE,

  -- Cron bookkeeping
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mission_recurrences_company_active
  ON mission_recurrences(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mission_recurrences_site
  ON mission_recurrences(site_id);

DROP TRIGGER IF EXISTS mission_recurrences_set_updated_at ON mission_recurrences;
CREATE TRIGGER mission_recurrences_set_updated_at
  BEFORE UPDATE ON mission_recurrences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE mission_recurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_recurrences_tenant ON mission_recurrences;
CREATE POLICY mission_recurrences_tenant ON mission_recurrences
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());

-- Link missions back to their recurrence (nullable — most missions are one-off)
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES mission_recurrences(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_missions_recurrence
  ON missions(recurrence_id)
  WHERE recurrence_id IS NOT NULL;
