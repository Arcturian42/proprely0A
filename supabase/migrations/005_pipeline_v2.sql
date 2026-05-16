-- Pipeline V2 Schema Migration
-- Adds new tables and columns for Commercial Pipeline module

-- ─── Extend leads table ────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'prospect'
    CHECK (lifecycle_stage IN ('prospect', 'lead', 'qualified', 'customer', 'former')),
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'nouveau'
    CHECK (pipeline_status IN ('nouveau', 'a_qualifier', 'devis_a_preparer', 'devis_envoye', 'en_discussion', 'gagne', 'perdu', 'archive')),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'tiede'
    CHECK (priority IN ('chaud', 'tiede', 'froid')),
  ADD COLUMN IF NOT EXISTS probability_pct INTEGER DEFAULT 30 CHECK (probability_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS value_monthly NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS value_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS lost_comment TEXT,
  ADD COLUMN IF NOT EXISTS won_reason TEXT,
  ADD COLUMN IF NOT EXISTS won_comment TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS next_action_note TEXT,
  ADD COLUMN IF NOT EXISTS estimated_close_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC(14,2);

-- ─── Contacts table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_company_isolation" ON contacts
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Pipeline tasks ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  template TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_company_id ON pipeline_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_lead_id ON pipeline_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_due_date ON pipeline_tasks(due_date);

ALTER TABLE pipeline_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_tasks_company_isolation" ON pipeline_tasks
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Pipeline notes ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_notes_lead_id ON pipeline_notes(lead_id);
ALTER TABLE pipeline_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_notes_company_isolation" ON pipeline_notes
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Emails ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  to_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  resend_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced')),
  template TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_emails_lead_id ON pipeline_emails(lead_id);
ALTER TABLE pipeline_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_emails_company_isolation" ON pipeline_emails
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Calls ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds INTEGER DEFAULT 0,
  summary TEXT,
  outcome TEXT CHECK (outcome IN ('no_answer', 'voicemail', 'connected', 'scheduled', 'qualified', 'not_interested')),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  made_by TEXT,
  made_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_calls_lead_id ON pipeline_calls(lead_id);
ALTER TABLE pipeline_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_calls_company_isolation" ON pipeline_calls
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Extend quotes table ─────────────────────────────────────────────────────

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS vocal_input_raw TEXT,
  ADD COLUMN IF NOT EXISTS parsed_data JSONB,
  ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending'
    CHECK (signature_status IN ('pending', 'signed')),
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

-- ─── Pipeline activities ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'quote', 'task', 'status_change', 'file', 'created')),
  content TEXT NOT NULL,
  author TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_activities_lead_id ON pipeline_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_created_at ON pipeline_activities(created_at DESC);
ALTER TABLE pipeline_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_activities_company_isolation" ON pipeline_activities
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Pipeline files ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('company', 'contact', 'quote', 'contract', 'other')),
  uploader TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_files_lead_id ON pipeline_files(lead_id);
ALTER TABLE pipeline_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_files_company_isolation" ON pipeline_files
  USING (company_id = (SELECT company_id FROM auth.users WHERE id = auth.uid()));

-- ─── Seed data ───────────────────────────────────────────────────────────────
-- NOTE: Seed data is provided via Zustand mock in pipeline-store.ts for MVP.
-- In production, insert via Supabase dashboard or a separate seed script.

-- Update timestamp trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts', 'pipeline_tasks', 'pipeline_notes'] LOOP
    EXECUTE format('
      CREATE OR REPLACE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    ', t, t);
  END LOOP;
END
$$;
