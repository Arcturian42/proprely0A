-- P3.5 / BUG-MIN-08 — Cascade soft-delete from clients to their sites.
--
-- Before this migration, archiving a client (set archived_at on `clients`)
-- left the related sites untouched. The UI filters them out client-side
-- because they're attached to an archived client, but the next reload
-- re-fetched the sites individually (filtered only on sites.archived_at IS
-- NULL) and they would reappear. The store cascade in src/lib/store.ts:258
-- masked the inconsistency locally — refreshing in another tab made it
-- obvious.
--
-- We add an AFTER UPDATE trigger on `clients` that mirrors archived_at onto
-- all child sites. Missions intentionally keep hard-DELETE behaviour : a
-- mission row is workflow state (planned / done / cancelled), not entity
-- master data — losing the row when the client is archived is intentional.
-- Time entries follow missions via FK ON DELETE CASCADE (existing schema).
--
-- Idempotent — safe to re-run.

CREATE OR REPLACE FUNCTION clients_archive_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when archived_at flips from NULL to a value (archive) or from
  -- a value to NULL (restore). Avoid the redundant write on every UPDATE.
  IF OLD.archived_at IS DISTINCT FROM NEW.archived_at THEN
    UPDATE sites
       SET archived_at = NEW.archived_at, updated_at = NOW()
     WHERE client_id = NEW.id
       AND archived_at IS DISTINCT FROM NEW.archived_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_clients_archive_cascade ON clients;
CREATE TRIGGER trg_clients_archive_cascade
  AFTER UPDATE OF archived_at ON clients
  FOR EACH ROW
  EXECUTE FUNCTION clients_archive_cascade();
