-- Sprint 2 (audit bêta) — defense in depth sur l'isolation tenant.
--
-- 1. FORCE ROW LEVEL SECURITY : par défaut, RLS ne s'applique PAS au
--    propriétaire de la table ni au rôle qui a `BYPASSRLS`. Quand un dev
--    distrait appelle Supabase avec la service_role key depuis un endpoint
--    qui n'a pas besoin de bypass, la requête ignore les policies tenant.
--    FORCE oblige TOUS les rôles (sauf superuser) à passer par RLS — même
--    le owner de la table. Le service_role qui a besoin de bypass devra
--    utiliser SET ROLE postgres ou être explicitement appelé en bypass.
--    Pour Proprely : signUpCompany + cron jobs sont les seuls callers
--    légitimes du service_role, et leurs scopes sont déjà bornés.
--
-- 2. Audit triggers étendus à mission_agents, agent_skills,
--    agent_availability : ces tables jointes étaient out-of-scope du
--    premier batch d'audit (qui se concentrait sur les entités racines).
--    Mais un admin malveillant pourrait réassigner les missions ou
--    modifier les compétences d'un agent sans laisser de trace. On ferme.

-- ─── 1. FORCE ROW LEVEL SECURITY ──────────────────────────────────────────

ALTER TABLE companies          FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE leads              FORCE ROW LEVEL SECURITY;
ALTER TABLE opportunities      FORCE ROW LEVEL SECURITY;
ALTER TABLE clients            FORCE ROW LEVEL SECURITY;
ALTER TABLE sites              FORCE ROW LEVEL SECURITY;
ALTER TABLE sops               FORCE ROW LEVEL SECURITY;
ALTER TABLE agents             FORCE ROW LEVEL SECURITY;
ALTER TABLE operational_items  FORCE ROW LEVEL SECURITY;
ALTER TABLE missions           FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_agents     FORCE ROW LEVEL SECURITY;
ALTER TABLE time_entries       FORCE ROW LEVEL SECURITY;
ALTER TABLE service_types      FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes             FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations        FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         FORCE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status  FORCE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules      FORCE ROW LEVEL SECURITY;
ALTER TABLE company_pricing_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_recurrences      FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_counters     FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications      FORCE ROW LEVEL SECURITY;

-- ─── 2. RLS + audit pour les tables jointes agent_* ───────────────────────
-- Le snapshot scope déjà par FK chain (cf. 20260101000002_rls.sql), mais
-- sans policy explicite, FORCE RLS bloquerait toutes les requêtes. On
-- ajoute les policies tenant-scopées via le parent `agents`.

ALTER TABLE agent_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills        FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_skills_tenant ON agent_skills;
CREATE POLICY agent_skills_tenant ON agent_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  );

ALTER TABLE agent_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_certifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_certifications_tenant ON agent_certifications;
CREATE POLICY agent_certifications_tenant ON agent_certifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  );

ALTER TABLE availability_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks  FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS availability_blocks_tenant ON availability_blocks;
CREATE POLICY availability_blocks_tenant ON availability_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.company_id = current_company_id())
  );

-- ─── 3. Audit triggers sur les tables jointes ────────────────────────────
-- Réutilise la fonction `audit_trigger_fn()` déjà définie dans
-- 20260517000007_audit_logs.sql. Idempotent : DROP IF EXISTS puis CREATE.

DROP TRIGGER IF EXISTS audit_mission_agents ON mission_agents;
CREATE TRIGGER audit_mission_agents
  AFTER INSERT OR UPDATE OR DELETE ON mission_agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_agent_skills ON agent_skills;
CREATE TRIGGER audit_agent_skills
  AFTER INSERT OR UPDATE OR DELETE ON agent_skills
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_availability_blocks ON availability_blocks;
CREATE TRIGGER audit_availability_blocks
  AFTER INSERT OR UPDATE OR DELETE ON availability_blocks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
