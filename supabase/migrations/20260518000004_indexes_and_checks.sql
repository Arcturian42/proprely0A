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

-- /rh/heures-paie groups time_entries by agent + date, exports by date range.
-- Column is `date`, not `scheduled_date` — see initial.sql.
CREATE INDEX IF NOT EXISTS idx_time_entries_company_agent_date
  ON time_entries(company_id, agent_id, date);

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

-- Non-negative numeric guards. Each wrapped in IF NOT EXISTS so the migration
-- is replay-safe. Only references columns that actually exist in the schema —
-- quotes.total_amount_ht doesn't exist (the total is in costs JSONB), so it's
-- excluded; same for time_entries.hours_worked and agents.rate_per_hour.
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
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_planned_hours_non_negative'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_planned_hours_non_negative
      CHECK (planned_hours IS NULL OR planned_hours >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_validated_hours_non_negative'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_validated_hours_non_negative
      CHECK (validated_hours IS NULL OR validated_hours >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'missions_planned_hours_non_negative'
  ) THEN
    ALTER TABLE missions
      ADD CONSTRAINT missions_planned_hours_non_negative
      CHECK (planned_hours IS NULL OR planned_hours >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_hourly_cost_non_negative'
  ) THEN
    ALTER TABLE agents
      ADD CONSTRAINT agents_hourly_cost_non_negative
      CHECK (hourly_cost IS NULL OR hourly_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sites_surface_area_non_negative'
  ) THEN
    ALTER TABLE sites
      ADD CONSTRAINT sites_surface_area_non_negative
      CHECK (surface_area IS NULL OR surface_area >= 0);
  END IF;
END $$;
