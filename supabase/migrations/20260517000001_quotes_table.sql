-- 20260517000001_quotes_table.sql
-- Création de la table quotes (devis), absente du schéma initial.
-- Référencée par src/types/index.ts Quote et src/lib/store.ts (addQuote/sendQuote/signQuote).

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  service_category TEXT NOT NULL CHECK (service_category IN (
    'fin_chantier', 'terrasse', 'sols_mecanises', 'moquette',
    'bureaux_recurrent', 'vitres', 'autre'
  )),
  surface_m2 NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN (
    'brouillon', 'envoye', 'signe', 'refuse', 'expire'
  )),
  -- Coûts (QuoteCostBreakdown)
  costs JSONB NOT NULL DEFAULT '{
    "labor_cost": 0, "machines_cost": 0, "consumables_cost": 0,
    "transport_cost": 0, "other_costs": 0, "total_cost_ht": 0,
    "margin_rate": 0, "price_ht": 0, "vat_rate": 0.2, "price_ttc": 0
  }'::jsonb,
  -- Lignes du devis (QuoteLineItem[])
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Notes visite + extraction IA
  site_visit_notes TEXT,
  extraction_data JSONB,
  -- Signature (compatible SignNow ET legacy Yousign)
  yousign_procedure_id TEXT,
  yousign_signature_url TEXT,
  signed_at TIMESTAMPTZ,
  -- Snapshot du client au moment du devis
  client_name TEXT NOT NULL,
  client_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity ON quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_yousign ON quotes(yousign_procedure_id)
  WHERE yousign_procedure_id IS NOT NULL;
