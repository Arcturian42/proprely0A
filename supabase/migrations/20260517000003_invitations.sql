-- Invitations table — owners and admins invite admin/agent collaborators.
-- The clear token is never stored; only sha256(token) lives in token_hash.
-- Single-use, company-scoped, expires after 7 days.

CREATE TABLE IF NOT EXISTS invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'sales', 'ops_manager', 'accountant', 'viewer')),
  first_name    TEXT,
  last_name     TEXT,
  token_hash    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company    ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status     ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_email      ON invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);

-- RLS — tenant scoping. Only owner/admin can write.
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitations_select ON invitations
  FOR SELECT USING (company_id = current_company_id());

CREATE POLICY invitations_write ON invitations
  FOR ALL
  USING (company_id = current_company_id() AND current_user_role() IN ('owner', 'admin'))
  WITH CHECK (company_id = current_company_id() AND current_user_role() IN ('owner', 'admin'));

-- Auto-update updated_at on row changes.
CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
