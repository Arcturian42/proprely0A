-- 20260517000000_pipeline_enrichment.sql
-- Resynchronise le schéma DB avec src/types/index.ts post-refonte pipeline.
--
-- Changements :
-- 1. Opportunity.stage : enum aligné sur le code (ouvert/decouverte/proposition/negociation/gagne/perdu)
-- 2. Opportunity : ajout des champs SIRENE (siren, siret, naf_code, legal_form, company_status),
--    contact_role, postal_code, next_action_type, next_action_note, source
-- 3. Opportunity.next_action_date : passage TIMESTAMPTZ → TEXT pour cohérence avec les ISO strings TS
--    (on garde TIMESTAMPTZ en réalité, juste mise à jour de la doc — pas de migration)

-- 1. Mapper les anciennes valeurs de stage vers les nouvelles
UPDATE opportunities SET stage = 'ouvert' WHERE stage IN ('lead', 'prise_de_contact');
UPDATE opportunities SET stage = 'gagne' WHERE stage = 'gagnee';
UPDATE opportunities SET stage = 'perdu' WHERE stage = 'perdue';

-- 2. Remplacer le CHECK constraint
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_stage_check;
ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_stage_check
  CHECK (stage IN ('ouvert', 'decouverte', 'proposition', 'negociation', 'gagne', 'perdu'));

-- 3. Mettre à jour la default value
ALTER TABLE opportunities ALTER COLUMN stage SET DEFAULT 'ouvert';

-- 4. Ajout des nouvelles colonnes Opportunity (issues du redesign pipeline + SIRENE autofill)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS next_action_note TEXT,
  ADD COLUMN IF NOT EXISTS siren TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS naf_code TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS company_status TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 5. Index pour la recherche par SIRET (souvent utilisé pour détecter doublons côté NewOpportunityFlow)
CREATE INDEX IF NOT EXISTS idx_opportunities_siret ON opportunities(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(company_id, stage);
