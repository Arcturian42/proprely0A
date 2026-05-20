-- Mission issue reporting (DM-04) and opportunity lost reason (CRM-05).
--
-- Two small fields added in the same migration to keep the diff history
-- readable. Both are nullable to avoid breaking existing rows / payloads.

-- DM-04 — when an agent taps "Signaler problème" we want a structured
-- category (so the dashboard can aggregate "X clients in incident"), a
-- description (the human-readable detail the manager needs to act on),
-- and optionally a photo URL stored later by a Supabase Storage upload.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS issue_category TEXT
  CHECK (issue_category IS NULL OR issue_category IN (
    'acces_refuse',         -- access denied / wrong key / building closed
    'materiel_manquant',    -- missing equipment or product
    'client_absent',        -- client not on-site for sign-off
    'site_non_conforme',    -- site state different from expectations
    'incident_agent',       -- injury / vehicle / personal incident
    'autre'                 -- catch-all
  ));
ALTER TABLE missions ADD COLUMN IF NOT EXISTS issue_description TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS issue_photo_url TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS issue_reported_at TIMESTAMPTZ;

-- CRM-05 — when an opportunity is marked perdu, the sales person must record
-- a reason. We store it as a free-form string for the beta (no enum yet —
-- we'll learn the categories from real usage before locking them in).
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
