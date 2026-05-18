-- Minimal seed — two companies, optionally one profile per role.
-- Idempotent (ON CONFLICT DO NOTHING) so re-running is safe.
--
-- Profiles are inserted ONLY when the matching auth.users row already
-- exists. That keeps Supabase Preview / CI happy (no FK error when
-- auth.users is empty) while still seeding the dev DB once the user has
-- manually created the auth users in Supabase Studio.

INSERT INTO companies (id, name, email, phone, address) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Proprely Nettoyage Pro', 'contact@proprely.fr', '01 23 45 67 89', '10 Rue de la Propreté, Paris'),
  ('22222222-2222-2222-2222-222222222222', 'ACME Cleaning',          'hello@acme.example',  '04 78 00 00 00', '15 Rue de la République, Lyon')
ON CONFLICT (id) DO NOTHING;

-- Seed profiles only for auth.users that already exist. In a fresh
-- Supabase Preview environment auth.users is empty → this insert is a no-op.
-- In local dev, create the auth users in Supabase Studio first with these
-- exact UUIDs, then re-run the seed.
INSERT INTO profiles (id, company_id, email, first_name, last_name, role)
SELECT
  seed.id::uuid,
  seed.company_id::uuid,
  seed.email,
  seed.first_name,
  seed.last_name,
  seed.role::user_role
FROM (
  VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner@proprely.fr', 'Alice', 'Owner', 'owner'),
    ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'admin@proprely.fr', 'Bob',   'Admin', 'admin'),
    ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'sales@proprely.fr', 'Chloé', 'Sales', 'sales'),
    ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'agent@proprely.fr', 'Farid', 'Agent', 'agent'),
    ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'owner@acme.example','Hugo',  'Owner', 'owner')
) AS seed(id, company_id, email, first_name, last_name, role)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = seed.id::uuid)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- E2E + manual QA fixtures (company 11111111-…). Idempotent. The auth.user
-- aaaaaaaa-0000-…-0001 (owner@proprely.fr) must exist for the FK constraints
-- on created_by. See supabase/SEED.md for the full setup workflow.
-- ════════════════════════════════════════════════════════════════════════════

-- Onboarding marked complete so the wizard middleware skips the redirect.
INSERT INTO onboarding_status (
  company_id, step_1_completed_at, step_2_team_skipped_at,
  step_3_services_completed_at, step_4_pricing_completed_at,
  step_5_settings_completed_at, completed_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  NOW(), NOW(), NOW(), NOW(), NOW(), NOW()
)
ON CONFLICT (company_id) DO NOTHING;

-- Company-wide pricing defaults
INSERT INTO company_pricing_settings (
  company_id, hourly_labor_cost, default_target_margin_pct, default_vat_rate,
  consumables_policy, travel_policy, equipment_mode, default_recurrence_mode
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  22.5, 35, 20,
  'per_quote_decision', 'per_quote_decision', 'per_quote_decision', 'per_pass'
)
ON CONFLICT (company_id) DO NOTHING;

-- Two service_types matching onboarding DEFAULT_SERVICES names so QuoteFlow's
-- ServiceCategory → service_type_id mapping kicks in.
INSERT INTO service_types (id, company_id, name, is_default, is_active, sort_order)
VALUES
  ('cccc1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Nettoyage de bureaux', TRUE, TRUE, 10),
  ('cccc1111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Nettoyage de vitres',  TRUE, TRUE, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pricing_rules (
  company_id, service_type_id, calculation_unit, base_price_ht,
  estimated_time_minutes, recommended_agents, target_margin_pct,
  default_vat_rate, recurrence_mode
)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'cccc1111-0000-0000-0000-000000000001', 'm2', 1.2, 120, 2, 35, 20, 'weekly'),
  ('11111111-1111-1111-1111-111111111111', 'cccc1111-0000-0000-0000-000000000002', 'm2', 4.5,  60, 1, 40, 20, 'one_shot')
ON CONFLICT (company_id, service_type_id) DO NOTHING;

-- Clients + sites (Tech Lyon + Cabinet Médical Bastille)
INSERT INTO clients (id, company_id, name, contact_name, email, phone, city, client_type, status)
VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tech Lyon SARL',           'Paul Bernard',  'contact@techlyon.fr',     '04 72 00 00 01', 'Lyon',  'bureaux', 'actif'),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cabinet Médical Bastille', 'Dr. Lefèvre',   'cabinet@bastille-med.fr','01 43 00 00 02', 'Paris', 'medical', 'actif')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sites (id, company_id, client_id, name, address, city, surface_area, service_type, frequency)
VALUES
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001', 'Siège Tech Lyon',                '15 rue de la Part-Dieu, 69003 Lyon',  'Lyon',  480, 'bureaux_recurrent', 'Hebdomadaire'),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000002', 'Cabinet rue Saint-Antoine',      '34 rue Saint-Antoine, 75004 Paris',   'Paris', 95,  'bureaux_recurrent', 'Hebdomadaire')
ON CONFLICT (id) DO NOTHING;

-- Two agents
INSERT INTO agents (id, company_id, first_name, last_name, email, phone, zone, contract_type, hourly_cost, weekly_availability_hours, status)
VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sophie', 'Martin', 'sophie@proprely.fr', '06 11 11 11 11', 'Paris', 'cdi', 18, 35, 'disponible'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Karim',  'Benali', 'karim@proprely.fr',  '06 22 22 22 22', 'Lyon',  'cdi', 17, 35, 'disponible')
ON CONFLICT (id) DO NOTHING;

-- Three missions (today, tomorrow, next week) with agent assignments
INSERT INTO missions (id, company_id, client_id, site_id, service_type, status, scheduled_date, start_time, planned_hours)
VALUES
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 'bureaux_recurrent', 'prevue', CURRENT_DATE,     '07:00', 2),
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'bureaux_recurrent', 'prevue', CURRENT_DATE + 1, '08:00', 4),
  ('66666666-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'bureaux_recurrent', 'prevue', CURRENT_DATE + 7, '08:00', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mission_agents (mission_id, agent_id)
VALUES
  ('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001'),
  ('66666666-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000002'),
  ('66666666-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000002')
ON CONFLICT (mission_id, agent_id) DO NOTHING;

-- Pipeline coverage: two open opportunities at different stages
INSERT INTO opportunities (id, company_id, title, prospect_name, contact_name, email, phone, city, client_type, service_type, estimated_amount, stage, status, source, notes)
VALUES
  ('77777777-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Prospection — Pharmacie Centrale', 'Pharmacie Centrale', 'Sylvie Roux',  'contact@pharmacie-centrale.fr', '01 40 00 00 11', 'Paris', 'medical', 'bureaux_recurrent', 4800, 'decouverte',  'ouvert', 'manual',     'Premier contact suite à recommandation'),
  ('77777777-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Prospection — Studio Yoga Marais', 'Studio Yoga Marais', 'Anne Lefèvre', 'studio@yoga-marais.fr',         NULL,            'Paris', 'autre',   'bureaux_recurrent', 2400, 'proposition', 'ouvert', 'sirene_api', 'Devis envoyé en attente de signature')
ON CONFLICT (id) DO NOTHING;
