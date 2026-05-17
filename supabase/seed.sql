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
