-- Company-wide pricing defaults — one row per company, populated through the
-- onboarding wizard (step 5) and editable later from /parametres.
-- Used as fallback when a pricing_rules override is NULL.
--
-- The meal_*, machine_rental_* columns are reserved for the future smart-
-- quote engine (long mission meal allowance, machine rental per day, etc).
-- We collect them in onboarding so we don't need a follow-up migration.
--
-- Idempotent — safe to re-run.

-- ENUMs ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumables_policy') THEN
    CREATE TYPE consumables_policy AS ENUM (
      'always_include',
      'never_include',
      'per_quote_decision'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'travel_policy') THEN
    CREATE TYPE travel_policy AS ENUM (
      'always_include',
      'never_include',
      'per_quote_decision'
    );
  END IF;
END $$;

-- Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_pricing_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,

  hourly_labor_cost           NUMERIC(10,2),
  default_target_margin_pct   NUMERIC(5,2),
  default_vat_rate            NUMERIC(5,2) DEFAULT 20,

  consumables_policy          consumables_policy DEFAULT 'per_quote_decision',
  travel_policy               travel_policy      DEFAULT 'per_quote_decision',
  equipment_mode              equipment_mode     DEFAULT 'per_quote_decision',

  default_recurrence_mode     recurrence_mode    DEFAULT 'per_pass',

  -- Reserved for the future smart-quote engine
  meal_allowance_threshold_hours NUMERIC(4,2),
  meal_allowance_amount          NUMERIC(10,2),
  machine_rental_daily_cost      NUMERIC(10,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS company_pricing_settings_set_updated_at ON company_pricing_settings;
CREATE TRIGGER company_pricing_settings_set_updated_at
  BEFORE UPDATE ON company_pricing_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE company_pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_pricing_settings_tenant ON company_pricing_settings;
CREATE POLICY company_pricing_settings_tenant ON company_pricing_settings
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());

-- Backfill: every existing company gets an empty settings row so the
-- onboarding wizard's upsert always finds a target.
INSERT INTO company_pricing_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;
