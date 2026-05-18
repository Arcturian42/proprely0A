-- Onboarding multi-step status — tracks each step's completion or explicit skip
-- per company. One row per company, created at signup (step 1 = always done).
-- Used by the middleware to force owners through the wizard until done.
--
-- Backfills existing companies as fully done, so live users aren't blocked
-- at next login.
--
-- Idempotent — safe to re-run.

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

DROP TRIGGER IF EXISTS onboarding_status_set_updated_at ON onboarding_status;
CREATE TRIGGER onboarding_status_set_updated_at
  BEFORE UPDATE ON onboarding_status
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_status_tenant ON onboarding_status;
CREATE POLICY onboarding_status_tenant ON onboarding_status
  FOR ALL USING (company_id = current_company_id())
        WITH CHECK (company_id = current_company_id());

-- Backfill: existing companies are considered fully onboarded so live users
-- aren't suddenly redirected into a wizard they never saw. Steps 2-5 are
-- marked skipped (not completed), so the company can revisit them via the
-- settings page later if needed.
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
ON CONFLICT (company_id) DO NOTHING;
