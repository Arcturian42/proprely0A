-- Enrich service_types with onboarding-relevant metadata.
-- - description: optional short description shown in the wizard
-- - is_default: true for the 11 standard cleaning services seeded per company
-- - is_active: soft-delete flag (we keep history for missions/quotes that
--   reference the service_type id)
-- - sort_order: display order in the wizard and settings UI
--
-- Idempotent — safe to re-run.

ALTER TABLE service_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS sort_order  INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_service_types_company_active
  ON service_types(company_id, is_active);
