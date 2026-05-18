-- Pricing rules — per service_type, per company.
-- Captures inputs needed by the future smart-quote engine (labor cost,
-- materials, consumables, target margin, VAT, recurrence). The engine
-- itself is out of scope for this sprint; we only collect the data.
--
-- NULL on override fields means "use company_pricing_settings default".
--
-- Idempotent — safe to re-run.

-- ENUMs ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calculation_unit') THEN
    CREATE TYPE calculation_unit AS ENUM (
      'm2',
      'linear_meter',
      'hour',
      'flat_rate',
      'room_count',
      'floor_count',
      'workstation_count',
      'weekly_passes',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_mode') THEN
    CREATE TYPE recurrence_mode AS ENUM (
      'per_pass',
      'weekly',
      'monthly',
      'annual_contract',
      'one_shot'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_mode') THEN
    CREATE TYPE equipment_mode AS ENUM (
      'included',
      'separate_line',
      'per_quote_decision'
    );
  END IF;
END $$;

-- Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id)     ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,

  calculation_unit       calculation_unit NOT NULL DEFAULT 'm2',
  calculation_unit_other TEXT,

  base_price_ht          NUMERIC(10,2),
  estimated_time_minutes INTEGER,
  recommended_agents     INTEGER DEFAULT 1,

  consumables_cost   NUMERIC(10,2),
  equipment_mode     equipment_mode,
  target_margin_pct  NUMERIC(5,2),
  default_vat_rate   NUMERIC(5,2),

  recurrence_mode    recurrence_mode DEFAULT 'one_shot',

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, service_type_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_company ON pricing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_service ON pricing_rules(service_type_id);

DROP TRIGGER IF EXISTS pricing_rules_set_updated_at ON pricing_rules;
CREATE TRIGGER pricing_rules_set_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_rules_tenant ON pricing_rules;
CREATE POLICY pricing_rules_tenant ON pricing_rules
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());
