-- Minimal seed — two companies + one profile per role, used for local dev and
-- as a sanity check that all FKs/RLS policies wire up correctly.
-- Run AFTER rls.sql. Assumes auth.users entries for the listed profile IDs exist.

INSERT INTO companies (id, name, email, phone, address) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Proprely Nettoyage Pro', 'contact@proprely.fr', '01 23 45 67 89', '10 Rue de la Propreté, Paris'),
  ('22222222-2222-2222-2222-222222222222', 'ACME Cleaning',          'hello@acme.example',  '04 78 00 00 00', '15 Rue de la République, Lyon');

-- One representative profile per role on company 1 (insert auth.users rows
-- with matching UUIDs in Supabase Studio before running this in production).
INSERT INTO profiles (id, company_id, email, first_name, last_name, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner@proprely.fr',    'Alice',  'Owner',    'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'admin@proprely.fr',    'Bob',    'Admin',    'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'sales@proprely.fr',    'Chloé',  'Sales',    'sales'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'ops@proprely.fr',      'Diego',  'Ops',      'ops_manager'),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'compta@proprely.fr',   'Eva',    'Compta',   'accountant'),
  ('aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'agent@proprely.fr',    'Farid',  'Agent',    'agent'),
  ('aaaaaaaa-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'viewer@proprely.fr',   'Gina',   'Viewer',   'viewer'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'owner@acme.example',   'Hugo',   'Owner',    'owner');
