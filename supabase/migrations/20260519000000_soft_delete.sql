-- Soft delete on the three entities the audit flagged as high-risk for hard
-- delete : clients, sites, agents. Hard DELETE on a client cascades to sites,
-- missions and time_entries — that's correct DB behaviour, but it's a one-way
-- door for the user, with no UX to recover. We move to archive-by-default
-- and keep DELETE as a recoverable operation for power flows.
--
-- All other tables (leads, opportunities, missions, time_entries, sops,
-- quotes, etc.) keep hard delete : they're either workflow rows the user
-- expects to actually disappear, or short-lived items that don't justify
-- the schema complexity.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE sites   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE agents  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Partial indexes : 99 % of queries filter `archived_at IS NULL`, the index
-- ignores the rare archived rows and stays compact.
CREATE INDEX IF NOT EXISTS idx_clients_active
  ON clients(company_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_active
  ON sites(company_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agents_active
  ON agents(company_id) WHERE archived_at IS NULL;
