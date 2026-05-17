-- Audit trail — generic log of who did what on the tenant-sensitive tables.
-- Visible to owner/admin via /parametres → Audit.
--
-- Trigger fires on INSERT/UPDATE/DELETE for a tightly-scoped allow-list of
-- tables. `before` and `after` store the row state as JSONB so we can diff
-- later without a schema migration each time we add a column.

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  before        JSONB,
  after         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read access : owner/admin only (audit trail is sensitive).
DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT
  USING (company_id = current_company_id() AND current_user_role() IN ('owner','admin'));

-- Writes are done by the trigger as SECURITY DEFINER — no direct INSERT
-- from app code. (No policy needed for that path; service role + triggers
-- bypass RLS.)

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID;
  company UUID;
  action TEXT;
BEGIN
  -- actor: prefer auth.uid() when available (server actions go through it).
  -- For service-role calls (webhooks, signup boot) actor will be NULL.
  actor := auth.uid();

  -- company: read from the row itself when the table has company_id, else
  -- bail out (we only audit tenant-scoped rows).
  IF TG_OP = 'DELETE' THEN
    company := (to_jsonb(OLD) ->> 'company_id')::uuid;
    action := 'delete';
  ELSIF TG_OP = 'UPDATE' THEN
    company := (to_jsonb(NEW) ->> 'company_id')::uuid;
    action := 'update';
  ELSE -- INSERT
    company := (to_jsonb(NEW) ->> 'company_id')::uuid;
    action := 'insert';
  END IF;

  IF company IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_logs (company_id, actor_id, entity_type, entity_id, action, before, after)
  VALUES (
    company,
    actor,
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW) ->> 'id'), (to_jsonb(OLD) ->> 'id')),
    action,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to the sensitive tables. Keep the list short — every triggered
-- audit row costs a write. Money/RH = always audited; ephemeral KPIs not.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies', 'profiles', 'missions', 'quotes', 'time_entries', 'invitations'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_log_trigger()',
      t, t
    );
  END LOOP;
END $$;
