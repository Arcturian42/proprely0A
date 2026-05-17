-- Switch e-signature provider from Yousign/SignNow → Docuseal.
-- The legacy column names (yousign_*) predate the SignNow integration that
-- also reused them; we now standardise on docuseal_* matching the new wrapper.
--
-- Idempotent : safe to re-run.

ALTER TABLE quotes
  RENAME COLUMN yousign_procedure_id TO docuseal_submission_id;
ALTER TABLE quotes
  RENAME COLUMN yousign_signature_url TO docuseal_signature_url;

-- The partial index we created in 20260517000001 also references the old
-- column name — drop and recreate.
DROP INDEX IF EXISTS idx_quotes_yousign;
CREATE INDEX IF NOT EXISTS idx_quotes_docuseal
  ON quotes(docuseal_submission_id)
  WHERE docuseal_submission_id IS NOT NULL;
