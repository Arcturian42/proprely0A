-- Quotes was missing from rls.sql when added in 20260517000001 — close the gap.
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_tenant ON quotes
  FOR ALL
  USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
