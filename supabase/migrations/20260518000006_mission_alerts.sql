-- Mission notification bookkeeping: track which missions already got their
-- reminder email and late alert so the cron doesn't spam.
--
-- Idempotent — safe to re-run.

ALTER TABLE missions ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS late_alert_sent_at TIMESTAMPTZ;

-- Partial indexes so the cron's "find what to alert on" queries stay fast:
-- we only ever care about rows where the flag is NULL.
CREATE INDEX IF NOT EXISTS idx_missions_reminder_pending
  ON missions(scheduled_date)
  WHERE reminder_sent_at IS NULL AND status = 'prevue';
CREATE INDEX IF NOT EXISTS idx_missions_late_pending
  ON missions(scheduled_date, start_time)
  WHERE late_alert_sent_at IS NULL AND status IN ('prevue', 'assigned', 'pending');
