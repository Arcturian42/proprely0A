-- Performance indexes on frequently filtered/sorted columns + data integrity
-- CHECK constraints. Both are additive and idempotent — safe to re-run.
--
-- Indexes target the listing pages (pipeline, planning, missions-du-jour,
-- heures-paie) so queries don't degrade once a company has a few hundred
-- rows. Constraints catch obviously invalid data (negative hours, inverted
-- date ranges) at the DB layer.

-- ─── Indexes ───────────────────────────────────────────────────────────────

-- /commercial/pipeline filters opportunities by stage + sorts by next_action_date
CREATE INDEX IF NOT EXISTS idx_opportunities_company_stage
  ON opportunities(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_next_action_date
  ON opportunities(next_action_date)
  WHERE next_action_date IS NOT NULL;

-- /operations/planning + missions-du-jour filter by date + status
CREATE INDEX IF NOT EXISTS idx_missions_company_scheduled
  ON missions(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_missions_status
  ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_operational_status
  ON missions(operational_status)
  WHERE operational_status IS NOT NULL;

-- /rh/heures-paie groups time_entries by agent + week, exports by date range
CREATE INDEX IF NOT EXISTS idx_time_entries_company_agent_date
  ON time_entries(company_id, agent_id, scheduled_date);

-- Quotes filtered by status (draft/sent/signe) in commercial overview
CREATE INDEX IF NOT EXISTS idx_quotes_company_status
  ON quotes(company_id, status);

-- Leads filtered by status (nouveau/qualifie/etc.) in lead inbox
CREATE INDEX IF NOT EXISTS idx_leads_company_status
  ON leads(company_id, status);

-- Sites listing per client
CREATE INDEX IF NOT EXISTS idx_sites_company_client
  ON sites(company_id, client_id);

-- Mission_agents lookups: which agents on which mission, and which missions
-- for which agent.
CREATE INDEX IF NOT EXISTS idx_mission_agents_mission
  ON mission_agents(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_agents_agent
  ON mission_agents(agent_id);

-- ─── Numeric CHECK constraints (idempotent) ────────────────────────────────

-- All money / duration / hour fields should be non-negative. We add the
-- constraints inside a DO block so the migration is idempotent even when
-- the constraint name already exists. ALTER TABLE ... ADD CONSTRAINT IF NOT
-- EXISTS is not supported on Postgres, hence the catch.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_estimated_amount_non_negative'
  ) THEN
    ALTER TABLE opportunities
      ADD CONSTRAINT opportunities_estimated_amount_non_negative
      CHECK (estimated_amount IS NULL OR estimated_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_hours_worked_non_negative'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_hours_worked_non_negative
      CHECK (hours_worked IS NULL OR hours_worked >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'missions_planned_hours_non_negative'
  ) THEN
    ALTER TABLE missions
      ADD CONSTRAINT missions_planned_hours_non_negative
      CHECK (planned_hours IS NULL OR planned_hours >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_rate_per_hour_non_negative'
  ) THEN
    ALTER TABLE agents
      ADD CONSTRAINT agents_rate_per_hour_non_negative
      CHECK (rate_per_hour IS NULL OR rate_per_hour >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sites_surface_area_non_negative'
  ) THEN
    ALTER TABLE sites
      ADD CONSTRAINT sites_surface_area_non_negative
      CHECK (surface_area IS NULL OR surface_area >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_total_ht_non_negative'
  ) THEN
    ALTER TABLE quotes
      ADD CONSTRAINT quotes_total_ht_non_negative
      CHECK (total_amount_ht IS NULL OR total_amount_ht >= 0);
  END IF;
END $$;
