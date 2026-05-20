-- Audit findings (20 mai 2026) — close the multi-tenant + search_path holes
-- before opening the beta to real customers.
--
-- 1. Four tables exist but have no RLS at all : a query made through the
--    authenticated/anon roles can read or write across tenants.
--      - workload_history       (scoped via agent_id → agents.company_id)
--      - fatigue_scores         (scoped via agent_id → agents.company_id)
--      - client_constraints     (scoped via site_id  → sites.company_id)
--      - scheduling_proposals   (scoped via mission_id → missions.company_id)
--
-- 2. Three trigger/helper functions are defined without an explicit
--    `SET search_path` (CVE-2018-1058 style) :
--      - set_updated_at()
--      - check_invitation_seat_limit()
--      - check_profile_seat_limit()
--
-- All idempotent : ALTER TABLE … ENABLE RLS is a no-op when already on,
-- DROP POLICY IF EXISTS precedes every CREATE POLICY, and ALTER FUNCTION
-- SET is harmless when re-applied.

-- ─── 1. RLS on the 4 unprotected tables ───────────────────────────────────

ALTER TABLE workload_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatigue_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_constraints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_proposals ENABLE ROW LEVEL SECURITY;

-- workload_history : scoped via agent_id → agents.company_id
DROP POLICY IF EXISTS workload_history_tenant ON workload_history;
CREATE POLICY workload_history_tenant ON workload_history
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  );

-- fatigue_scores : same shape — agent_id is also the PK here
DROP POLICY IF EXISTS fatigue_scores_tenant ON fatigue_scores;
CREATE POLICY fatigue_scores_tenant ON fatigue_scores
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  );

-- client_constraints : scoped via site_id → sites.company_id
DROP POLICY IF EXISTS client_constraints_tenant ON client_constraints;
CREATE POLICY client_constraints_tenant ON client_constraints
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM sites s WHERE s.id = site_id AND s.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sites s WHERE s.id = site_id AND s.company_id = current_company_id())
  );

-- scheduling_proposals : scoped via mission_id → missions.company_id
DROP POLICY IF EXISTS scheduling_proposals_tenant ON scheduling_proposals;
CREATE POLICY scheduling_proposals_tenant ON scheduling_proposals
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.company_id = current_company_id())
  );

-- ─── 2. search_path on the 3 unsafe functions ────────────────────────────
-- Without an explicit search_path, a malicious user with write access to a
-- schema earlier in their own search_path can shadow `public.<fn>` calls
-- inside SECURITY DEFINER functions. Pin to `public, pg_temp` so the lookup
-- is deterministic and immune to shim attacks.

ALTER FUNCTION set_updated_at()              SET search_path = public, pg_temp;
ALTER FUNCTION check_invitation_seat_limit() SET search_path = public, pg_temp;
ALTER FUNCTION check_profile_seat_limit()    SET search_path = public, pg_temp;

-- ─── 3. PostgREST schema reload ──────────────────────────────────────────
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
