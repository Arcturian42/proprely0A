-- In-app notifications inbox. Powers the bell icon + dropdown panel in the
-- admin shell. Mirrors what mission-alerts cron sends by email but adds the
-- "no email needed, just nudge in the UI" channel.
--
-- Design notes :
--  * `recipient_id` is the auth.users.id (profile owner) — notifs are
--    per-user, not per-company, so two admins on the same company can each
--    have a distinct read/unread state.
--  * `kind` is a string (not enum) so new event types ship in code only,
--    without a migration. Keep values lowercase snake_case.
--  * `link_path` is the relative URL to navigate when the user clicks.
--    Null = info-only notif (no action).
--  * `severity` mirrors what we render visually (info/warn/critical).
--  * Soft-delete via `read_at` — never DELETE so users keep an audit trail.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warn', 'critical')),
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most queries are "give me the unread for the current user, newest first".
-- Partial index keeps it lean.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications(recipient_id, created_at DESC)
  WHERE read_at IS NULL;

-- Full history view for the dropdown (read + unread, recent first).
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_recent
  ON notifications(recipient_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tenant isolation : even if a bug puts the wrong recipient_id, you can't
-- see notifs from another company. Belt + suspenders.
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (
    company_id = current_company_id()
    AND recipient_id = auth.uid()
  );

-- Mark-as-read flow : a user can update *their own* notification — only the
-- `read_at` column matters in practice but we don't constrain at policy
-- level (server actions are the API surface, RLS is the safety net).
DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (
    company_id = current_company_id()
    AND recipient_id = auth.uid()
  )
  WITH CHECK (
    company_id = current_company_id()
    AND recipient_id = auth.uid()
  );

-- INSERT is done from server actions running as the authenticated caller
-- (or as service_role for system-generated notifs). We allow inserts where
-- company_id matches the caller — the recipient_id check is done in the
-- app layer (we want to notify *other* users, not only ourselves).
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (company_id = current_company_id());

-- No DELETE policy — notifications are never deleted from the UI. If GDPR
-- erasure is needed it goes through a service-role admin task.
