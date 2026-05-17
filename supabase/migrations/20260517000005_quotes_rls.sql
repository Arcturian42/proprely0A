-- Quotes was missing from rls.sql when added in 20260517000001 — close the gap.
-- Idempotent so we can re-apply alongside the updated rls.sql.
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_tenant ON quotes;
CREATE POLICY quotes_tenant ON quotes
  FOR ALL
  USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
