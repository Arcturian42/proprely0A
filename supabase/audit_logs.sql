-- Audit log — append-only record of every write on business tables.
-- Run AFTER profiles.sql.

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  actor_id UUID,                        -- profiles.id (NULL = system / before-auth)
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  diff JSONB,                           -- {before, after} for UPDATE; new row for INSERT; old row for DELETE
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_company_table_date ON audit_logs(company_id, table_name, created_at DESC);
CREATE INDEX idx_audit_logs_row ON audit_logs(table_name, row_id);

-- Append-only: no UPDATE/DELETE policies — even owners cannot rewrite history.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_read ON audit_logs
  FOR SELECT USING (company_id = current_company_id());

-- Generic trigger function: writes a log row on any change.
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_row_id  UUID;
  v_diff    JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_company := OLD.company_id;
    v_row_id  := OLD.id;
    v_diff    := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_company := NEW.company_id;
    v_row_id  := NEW.id;
    v_diff    := to_jsonb(NEW);
  ELSE
    v_company := NEW.company_id;
    v_row_id  := NEW.id;
    v_diff    := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  END IF;

  INSERT INTO audit_logs (company_id, actor_id, table_name, row_id, action, diff)
  VALUES (v_company, auth.uid(), TG_TABLE_NAME, v_row_id, TG_OP, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to every business table.
CREATE TRIGGER audit_leads             AFTER INSERT OR UPDATE OR DELETE ON leads             FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_opportunities     AFTER INSERT OR UPDATE OR DELETE ON opportunities     FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_clients           AFTER INSERT OR UPDATE OR DELETE ON clients           FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_sites             AFTER INSERT OR UPDATE OR DELETE ON sites             FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_sops              AFTER INSERT OR UPDATE OR DELETE ON sops              FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_agents            AFTER INSERT OR UPDATE OR DELETE ON agents            FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_operational_items AFTER INSERT OR UPDATE OR DELETE ON operational_items FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_missions          AFTER INSERT OR UPDATE OR DELETE ON missions          FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_time_entries      AFTER INSERT OR UPDATE OR DELETE ON time_entries      FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_service_types     AFTER INSERT OR UPDATE OR DELETE ON service_types     FOR EACH ROW EXECUTE FUNCTION log_audit();
