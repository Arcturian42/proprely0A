-- Proprely Admin - Seed Data
-- Realistic French cleaning company data matching mock-data.ts

-- ============================================================
-- Company (tenant)
-- ============================================================

INSERT INTO companies (id, name, email, phone, address, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'PropreMent SAS',
  'contact@proprement.fr',
  '01 23 45 67 89',
  '10 Rue du Commerce, 75015 Paris',
  '2026-01-01T08:00:00Z',
  '2026-01-01T08:00:00Z'
);

-- ============================================================
-- SOPs (inserted before sites/missions that reference them)
-- ============================================================

INSERT INTO sops (id, company_id, title, service_type, estimated_duration_minutes,
  required_skills, required_materials, required_products, checklist_items,
  safety_instructions, notes, created_at, updated_at)
VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Nettoyage bureaux standard',
  'nettoyage_bureaux',
  120,
  ARRAY['nettoyage'],
  ARRAY['aspirateur', 'balai', 'serpillière'],
  ARRAY['détergent multi-surfaces', 'désinfectant'],
  '[{"id":"c1","text":"Vider les corbeilles"},{"id":"c2","text":"Dépoussiérer les bureaux"},{"id":"c3","text":"Aspirer les moquettes"},{"id":"c4","text":"Nettoyer les sanitaires"},{"id":"c5","text":"Passer la serpillière"},{"id":"c6","text":"Nettoyer les vitres intérieures"}]',
  'Porter des gants. Ventiler lors de l''utilisation de produits chimiques.',
  NULL,
  '2026-01-10T10:00:00Z',
  '2026-01-10T10:00:00Z'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Désinfection cabinet médical',
  'nettoyage_medical',
  90,
  ARRAY['nettoyage', 'désinfection'],
  ARRAY['chariot de nettoyage', 'sprays'],
  ARRAY['désinfectant hospitalier', 'lingettes virucides'],
  '[{"id":"c1","text":"Désinfecter tables d''examen"},{"id":"c2","text":"Nettoyer et désinfecter sanitaires"},{"id":"c3","text":"Désinfecter poignées de portes"},{"id":"c4","text":"Vider poubelles médicales"},{"id":"c5","text":"Aspirer et serpillière salle attente"}]',
  'EPI obligatoire : masque FFP2, gants nitrile, sur-chaussures.',
  'Utiliser uniquement des produits certifiés EN14476',
  '2026-02-05T10:00:00Z',
  '2026-02-05T10:00:00Z'
);

-- ============================================================
-- Agents
-- ============================================================

INSERT INTO agents (id, company_id, first_name, last_name, phone, email, specialty,
  skills, business_registration_number, contract_type, weekly_availability_hours,
  weekly_availability, zone, status, hourly_cost, notes, created_at, updated_at)
VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Marie', 'Dupont',
  '06 12 34 56 78', 'marie.dupont@example.com',
  'Nettoyage bureaux',
  ARRAY['nettoyage', 'désinfection'],
  NULL, 'cdi', 35,
  '{"lundi":true,"mardi":true,"mercredi":true,"jeudi":true,"vendredi":true,"samedi":false,"dimanche":false}',
  'Paris 8e', 'disponible', 14, NULL,
  '2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z'
),
(
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Jean', 'Martin',
  '06 98 76 54 32', 'jean.martin@example.com',
  'Vitrerie',
  ARRAY['vitrerie', 'nettoyage haute pression'],
  '123456789', 'auto_entrepreneur', 20,
  '{"lundi":true,"mardi":false,"mercredi":true,"jeudi":false,"vendredi":true,"samedi":true,"dimanche":false}',
  'Paris 9e', 'disponible', 18, NULL,
  '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'
),
(
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Fatou', 'Diallo',
  '07 11 22 33 44', 'fatou.diallo@example.com',
  'Nettoyage industriel',
  ARRAY['nettoyage industriel', 'produits chimiques'],
  NULL, 'cdd', 25,
  '{"lundi":true,"mardi":true,"mercredi":false,"jeudi":true,"vendredi":true,"samedi":false,"dimanche":false}',
  'Banlieue Nord', 'occupe', 15, NULL,
  '2026-03-10T10:00:00Z', '2026-03-10T10:00:00Z'
);

-- ============================================================
-- Clients
-- ============================================================

INSERT INTO clients (id, company_id, name, contact_name, email, phone,
  billing_address, city, client_type, status, notes,
  created_from_opportunity_id, created_at, updated_at)
VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Groupe Immobilier Haussman', 'Pierre Leblanc',
  'contact@haussman.fr', '01 23 45 67 89',
  '123 Av. des Champs-Élysées', 'Paris',
  'entreprise', 'actif', 'Client premium, 3 immeubles',
  NULL, '2026-01-20T10:00:00Z', '2026-01-20T10:00:00Z'
),
(
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Cabinet Médical Saint-Lazare', 'Dr. Sophie Renard',
  'cabinet@saint-lazare.fr', '01 87 65 43 21',
  '45 Rue Saint-Lazare', 'Paris',
  'professionnel', 'actif', NULL,
  NULL, '2026-02-10T10:00:00Z', '2026-02-10T10:00:00Z'
);

-- ============================================================
-- Sites
-- ============================================================

INSERT INTO sites (id, company_id, client_id, name, address, city, surface_area,
  access_code, access_instructions, service_type, frequency, sop_id, notes,
  created_from_opportunity_id, created_at, updated_at)
VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'Immeuble Champs-Élysées',
  '123 Av. des Champs-Élysées', 'Paris', 1200,
  '1234A', 'Portail principal, badge remis au gardien',
  'nettoyage_bureaux', 'quotidien',
  'b0000000-0000-0000-0000-000000000001',
  NULL, NULL, '2026-01-20T10:00:00Z', '2026-01-20T10:00:00Z'
),
(
  'e0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'Parking Souterrain',
  '123 Av. des Champs-Élysées (sous-sol)', 'Paris', 800,
  NULL, 'Accès depuis le hall B',
  'nettoyage_parking', 'hebdomadaire',
  NULL, NULL, NULL, '2026-01-25T10:00:00Z', '2026-01-25T10:00:00Z'
),
(
  'e0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'Cabinet médical - Salle attente + consultation',
  '45 Rue Saint-Lazare', 'Paris', 150,
  '9876', 'Digicode entrée immeuble',
  'nettoyage_medical', 'quotidien',
  'b0000000-0000-0000-0000-000000000002',
  'Désinfection renforcée zones consultation',
  NULL, '2026-02-10T10:00:00Z', '2026-02-10T10:00:00Z'
);

-- ============================================================
-- Leads
-- ============================================================

INSERT INTO leads (id, company_id, company_name, sector, city, email, phone,
  website, source, ai_score, probable_need, status, notes,
  converted_opportunity_id, created_at, updated_at)
VALUES
(
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Restaurant Le Gourmet', 'Restauration', 'Paris 2e',
  'contact@legourmet.fr', '01 42 33 44 55',
  'www.legourmet.fr', 'linkedin', 85,
  'Nettoyage cuisine et salle quotidien',
  'nouveau', NULL, NULL,
  '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z'
),
(
  'f0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Agence Immobilière Voltaire', 'Immobilier', 'Paris 11e',
  'agence@voltaire-immo.fr', '01 55 66 77 88',
  NULL, 'google_maps', 72,
  'Nettoyage bureaux 2x/semaine',
  'a_contacter', 'Appelez le matin', NULL,
  '2026-05-05T10:00:00Z', '2026-05-05T10:00:00Z'
),
(
  'f0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Clinique Vétérinaire du Marais', 'Santé animale', 'Paris 3e',
  'contact@vetmarais.fr', '01 48 87 65 43',
  'www.vetmarais.fr', 'referral', 91,
  'Nettoyage et désinfection quotidien',
  'contacte', 'Très intéressé, envoyer devis', NULL,
  '2026-05-08T10:00:00Z', '2026-05-08T10:00:00Z'
);

-- ============================================================
-- Opportunities
-- ============================================================

INSERT INTO opportunities (id, company_id, lead_id, client_id, site_id,
  title, prospect_name, contact_name, email, phone, city, site_address,
  client_type, service_type, estimated_amount, stage, next_action_date,
  notes, status, converted_to_client, converted_at, created_at, updated_at)
VALUES
(
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  NULL, NULL, NULL,
  'Nettoyage bureaux - Tech Solutions', 'Tech Solutions SARL',
  'Marc Dubois', 'marc@techsolutions.fr', '06 11 22 33 44',
  'Paris 9e', '12 Rue de la Paix, Paris',
  'entreprise', 'nettoyage_bureaux', 2400,
  'proposition', '2026-05-20T09:00:00Z',
  'Attente retour devis', 'ouvert', FALSE, NULL,
  '2026-05-10T10:00:00Z', '2026-05-10T10:00:00Z'
),
(
  'g0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001', NULL, NULL,
  'Nettoyage cuisine - Le Gourmet', 'Restaurant Le Gourmet',
  'Antoine Lebrun', 'contact@legourmet.fr', '01 42 33 44 55',
  'Paris 2e', '8 Rue Montorgueil, Paris',
  'professionnel', 'nettoyage_restauration', 1800,
  'decouverte', '2026-05-18T14:00:00Z',
  'RDV découverte programmé', 'ouvert', FALSE, NULL,
  '2026-05-12T10:00:00Z', '2026-05-12T10:00:00Z'
),
(
  'g0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  NULL, NULL, NULL,
  'Contrat entretien - Résidence Balzac', 'Syndic Résidence Balzac',
  'Claire Fontaine', 'syndic@residencebalzac.fr', '01 44 55 66 77',
  'Boulogne-Billancourt', '5 Allée Balzac, Boulogne',
  'syndic', 'nettoyage_residence', 3600,
  'negociation', '2026-05-17T10:00:00Z',
  'Négociation prix en cours', 'ouvert', FALSE, NULL,
  '2026-05-08T10:00:00Z', '2026-05-08T10:00:00Z'
);

-- ============================================================
-- Missions
-- ============================================================

INSERT INTO missions (id, company_id, client_id, site_id, operational_item_id,
  service_type, sop_id, status, scheduled_date, start_time, planned_hours,
  notes, priority, created_at, updated_at)
VALUES
(
  'h0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  NULL,
  'nettoyage_bureaux',
  'b0000000-0000-0000-0000-000000000001',
  'en_cours', '2026-05-16', '08:00', 3,
  NULL, 'normale',
  '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z'
),
(
  'h0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  NULL,
  'nettoyage_medical',
  'b0000000-0000-0000-0000-000000000002',
  'prevue', '2026-05-16', '18:00', 2,
  'Accès après fermeture cabinet', 'haute',
  '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z'
),
(
  'h0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  NULL,
  'nettoyage_parking',
  NULL,
  'prevue', '2026-05-17', '07:00', 4,
  NULL, 'normale',
  '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z'
);

-- ============================================================
-- Mission Agents
-- ============================================================

INSERT INTO mission_agents (mission_id, agent_id)
VALUES
  ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('h0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003'),
  ('h0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002'),
  ('h0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003');

-- ============================================================
-- Operational Items
-- ============================================================

INSERT INTO operational_items (id, company_id, client_id, site_id, opportunity_id,
  source, title, status, priority, notes, converted_to_mission, mission_id,
  created_at, updated_at)
VALUES
(
  'i0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  NULL, 'contrat',
  'Nettoyage quotidien - Immeuble Champs-Élysées',
  'en_cours', 'haute', NULL, TRUE,
  'h0000000-0000-0000-0000-000000000001',
  '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z'
),
(
  'i0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  NULL, 'contrat',
  'Désinfection cabinet - soir',
  'planifie', 'haute', 'Accès avec code 9876', FALSE, NULL,
  '2026-05-05T10:00:00Z', '2026-05-05T10:00:00Z'
),
(
  'i0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  NULL, 'demande_client',
  'Nettoyage parking mensuel',
  'a_organiser', 'normale', 'À planifier avant fin du mois', FALSE, NULL,
  '2026-05-10T10:00:00Z', '2026-05-10T10:00:00Z'
);

-- ============================================================
-- Time Entries
-- ============================================================

INSERT INTO time_entries (id, company_id, mission_id, agent_id, client_id, site_id,
  date, planned_hours, validated_hours, hourly_cost, total_cost, status,
  validated_at, created_at, updated_at)
VALUES
(
  'j0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'h0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  '2026-05-16', 3, NULL, 14, NULL, 'a_valider', NULL,
  '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z'
),
(
  'j0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'h0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  '2026-05-16', 2, NULL, 15, NULL, 'prevue', NULL,
  '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z'
);
