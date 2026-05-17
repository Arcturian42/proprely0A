import { Agent, Client, Lead, Mission, Opportunity, OperationalItem, Site, Sop, TimeEntry } from '@/types'
import { DUMMY_COMPANY_1_ID, DUMMY_COMPANY_2_ID } from './auth/dummy'

const C1 = DUMMY_COMPANY_1_ID
const C2 = DUMMY_COMPANY_2_ID

const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

// ─── Company 1 — Proprely Nettoyage Pro ──────────────────────────────────────

const c1Agents: Agent[] = [
  {
    id: 'agent-1', company_id: C1, first_name: 'Marie', last_name: 'Dupont',
    phone: '06 12 34 56 78', email: 'marie.dupont@example.com',
    specialty: 'Nettoyage bureaux', skills: ['nettoyage', 'désinfection'],
    business_registration_number: null, contract_type: 'cdi',
    weekly_availability_hours: 35,
    weekly_availability: { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false },
    zone: 'Paris 8e', status: 'disponible', hourly_cost: 14, notes: null,
    created_at: '2026-01-15T10:00:00Z', updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'agent-2', company_id: C1, first_name: 'Jean', last_name: 'Martin',
    phone: '06 98 76 54 32', email: 'jean.martin@example.com',
    specialty: 'Vitrerie', skills: ['vitrerie', 'nettoyage haute pression'],
    business_registration_number: '123456789', contract_type: 'auto_entrepreneur',
    weekly_availability_hours: 20,
    weekly_availability: { lundi: true, mardi: false, mercredi: true, jeudi: false, vendredi: true, samedi: true, dimanche: false },
    zone: 'Paris 9e', status: 'disponible', hourly_cost: 18, notes: null,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-3', company_id: C1, first_name: 'Fatou', last_name: 'Diallo',
    phone: '07 11 22 33 44', email: 'fatou.diallo@example.com',
    specialty: 'Nettoyage industriel', skills: ['nettoyage industriel', 'produits chimiques'],
    business_registration_number: null, contract_type: 'cdd',
    weekly_availability_hours: 25,
    weekly_availability: { lundi: true, mardi: true, mercredi: false, jeudi: true, vendredi: true, samedi: false, dimanche: false },
    zone: 'Banlieue Nord', status: 'occupe', hourly_cost: 15, notes: null,
    created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z',
  },
]

const c1Clients: Client[] = [
  {
    id: 'client-1', company_id: C1, name: 'Groupe Immobilier Haussman',
    contact_name: 'Pierre Leblanc', email: 'contact@haussman.fr', phone: '01 23 45 67 89',
    billing_address: '123 Av. des Champs-Élysées', city: 'Paris',
    client_type: 'entreprise', status: 'actif', notes: 'Client premium, 3 immeubles',
    created_from_opportunity_id: null,
    created_at: '2026-01-20T10:00:00Z', updated_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'client-2', company_id: C1, name: 'Cabinet Médical Saint-Lazare',
    contact_name: 'Dr. Sophie Renard', email: 'cabinet@saint-lazare.fr', phone: '01 87 65 43 21',
    billing_address: '45 Rue Saint-Lazare', city: 'Paris',
    client_type: 'professionnel', status: 'actif', notes: null,
    created_from_opportunity_id: null,
    created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-10T10:00:00Z',
  },
]

const c1Sites: Site[] = [
  {
    id: 'site-1', company_id: C1, client_id: 'client-1',
    name: 'Immeuble Champs-Élysées', address: '123 Av. des Champs-Élysées', city: 'Paris',
    surface_area: 1200, access_code: '1234A', access_instructions: 'Portail principal, badge remis au gardien',
    service_type: 'nettoyage_bureaux', frequency: 'quotidien', sop_id: 'sop-1', notes: null,
    created_from_opportunity_id: null,
    created_at: '2026-01-20T10:00:00Z', updated_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'site-2', company_id: C1, client_id: 'client-1',
    name: 'Parking Souterrain', address: '123 Av. des Champs-Élysées (sous-sol)', city: 'Paris',
    surface_area: 800, access_code: null, access_instructions: 'Accès depuis le hall B',
    service_type: 'nettoyage_parking', frequency: 'hebdomadaire', sop_id: null, notes: null,
    created_from_opportunity_id: null,
    created_at: '2026-01-25T10:00:00Z', updated_at: '2026-01-25T10:00:00Z',
  },
  {
    id: 'site-3', company_id: C1, client_id: 'client-2',
    name: 'Cabinet médical - Salle attente + consultation', address: '45 Rue Saint-Lazare', city: 'Paris',
    surface_area: 150, access_code: '9876', access_instructions: 'Digicode entrée immeuble',
    service_type: 'nettoyage_medical', frequency: 'quotidien', sop_id: 'sop-2',
    notes: 'Désinfection renforcée zones consultation',
    created_from_opportunity_id: null,
    created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-10T10:00:00Z',
  },
]

const c1Leads: Lead[] = [
  {
    id: 'lead-1', company_id: C1, company_name: 'Restaurant Le Gourmet',
    sector: 'Restauration', city: 'Paris 2e',
    email: 'contact@legourmet.fr', phone: '01 42 33 44 55', website: 'www.legourmet.fr',
    source: 'linkedin', ai_score: 85, probable_need: 'Nettoyage cuisine et salle quotidien',
    status: 'nouveau', notes: null, converted_opportunity_id: null,
    created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:00Z',
  },
  {
    id: 'lead-2', company_id: C1, company_name: 'Agence Immobilière Voltaire',
    sector: 'Immobilier', city: 'Paris 11e',
    email: 'agence@voltaire-immo.fr', phone: '01 55 66 77 88', website: null,
    source: 'google_maps', ai_score: 72, probable_need: 'Nettoyage bureaux 2x/semaine',
    status: 'a_contacter', notes: 'Appelez le matin', converted_opportunity_id: null,
    created_at: '2026-05-05T10:00:00Z', updated_at: '2026-05-05T10:00:00Z',
  },
  {
    id: 'lead-3', company_id: C1, company_name: 'Clinique Vétérinaire du Marais',
    sector: 'Santé animale', city: 'Paris 3e',
    email: 'contact@vetmarais.fr', phone: '01 48 87 65 43', website: 'www.vetmarais.fr',
    source: 'referral', ai_score: 91, probable_need: 'Nettoyage et désinfection quotidien',
    status: 'contacte', notes: 'Très intéressé, envoyer devis', converted_opportunity_id: null,
    created_at: '2026-05-08T10:00:00Z', updated_at: '2026-05-08T10:00:00Z',
  },
]

const c1Opportunities: Opportunity[] = [
  {
    id: 'opp-1', company_id: C1, lead_id: null, client_id: null, site_id: null,
    title: 'Nettoyage bureaux - Tech Solutions', prospect_name: 'Tech Solutions SARL',
    contact_name: 'Marc Dubois', email: 'marc@techsolutions.fr', phone: '06 11 22 33 44',
    city: 'Paris 9e', site_address: '12 Rue de la Paix, Paris',
    client_type: 'entreprise', service_type: 'nettoyage_bureaux',
    estimated_amount: 2400, stage: 'proposition',
    next_action_date: '2026-05-20T09:00:00Z', notes: 'Attente retour devis',
    status: 'ouvert', converted_to_client: false, converted_at: null,
    created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 'opp-2', company_id: C1, lead_id: 'lead-1', client_id: null, site_id: null,
    title: 'Nettoyage cuisine - Le Gourmet', prospect_name: 'Restaurant Le Gourmet',
    contact_name: 'Antoine Lebrun', email: 'contact@legourmet.fr', phone: '01 42 33 44 55',
    city: 'Paris 2e', site_address: '8 Rue Montorgueil, Paris',
    client_type: 'professionnel', service_type: 'nettoyage_restauration',
    estimated_amount: 1800, stage: 'decouverte',
    next_action_date: '2026-05-18T14:00:00Z', notes: 'RDV découverte programmé',
    status: 'ouvert', converted_to_client: false, converted_at: null,
    created_at: '2026-05-12T10:00:00Z', updated_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'opp-3', company_id: C1, lead_id: null, client_id: null, site_id: null,
    title: 'Contrat entretien - Résidence Balzac', prospect_name: 'Syndic Résidence Balzac',
    contact_name: 'Claire Fontaine', email: 'syndic@residencebalzac.fr', phone: '01 44 55 66 77',
    city: 'Boulogne-Billancourt', site_address: '5 Allée Balzac, Boulogne',
    client_type: 'syndic', service_type: 'nettoyage_residence',
    estimated_amount: 3600, stage: 'negociation',
    next_action_date: '2026-05-17T10:00:00Z', notes: 'Négociation prix en cours',
    status: 'ouvert', converted_to_client: false, converted_at: null,
    created_at: '2026-05-08T10:00:00Z', updated_at: '2026-05-08T10:00:00Z',
  },
]

const c1Sops: Sop[] = [
  {
    id: 'sop-1', company_id: C1, title: 'Nettoyage bureaux standard',
    service_type: 'nettoyage_bureaux', estimated_duration_minutes: 120,
    required_skills: ['nettoyage'],
    required_materials: ['aspirateur', 'balai', 'serpillière'],
    required_products: ['détergent multi-surfaces', 'désinfectant'],
    checklist_items: [
      { id: 'c1', text: 'Vider les corbeilles' },
      { id: 'c2', text: 'Dépoussiérer les bureaux' },
      { id: 'c3', text: 'Aspirer les moquettes' },
      { id: 'c4', text: 'Nettoyer les sanitaires' },
      { id: 'c5', text: 'Passer la serpillière' },
      { id: 'c6', text: 'Nettoyer les vitres intérieures' },
    ],
    safety_instructions: 'Porter des gants. Ventiler lors de l\'utilisation de produits chimiques.',
    notes: null,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'sop-2', company_id: C1, title: 'Désinfection cabinet médical',
    service_type: 'nettoyage_medical', estimated_duration_minutes: 90,
    required_skills: ['nettoyage', 'désinfection'],
    required_materials: ['chariot de nettoyage', 'sprays'],
    required_products: ['désinfectant hospitalier', 'lingettes virucides'],
    checklist_items: [
      { id: 'c1', text: 'Désinfecter tables d\'examen' },
      { id: 'c2', text: 'Nettoyer et désinfecter sanitaires' },
      { id: 'c3', text: 'Désinfecter poignées de portes' },
      { id: 'c4', text: 'Vider poubelles médicales' },
      { id: 'c5', text: 'Aspirer et serpillière salle attente' },
    ],
    safety_instructions: 'EPI obligatoire : masque FFP2, gants nitrile, sur-chaussures.',
    notes: 'Utiliser uniquement des produits certifiés EN14476',
    created_at: '2026-02-05T10:00:00Z', updated_at: '2026-02-05T10:00:00Z',
  },
]

const c1Missions: Mission[] = [
  {
    id: 'mission-1', company_id: C1, client_id: 'client-1', site_id: 'site-1',
    operational_item_id: null, service_type: 'nettoyage_bureaux', sop_id: 'sop-1',
    status: 'en_cours', scheduled_date: today, start_time: '08:00',
    planned_hours: 3, notes: null, priority: 'normale',
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    client: c1Clients[0], site: c1Sites[0], agents: [c1Agents[0]], sop: c1Sops[0],
  },
  {
    id: 'mission-2', company_id: C1, client_id: 'client-2', site_id: 'site-3',
    operational_item_id: null, service_type: 'nettoyage_medical', sop_id: 'sop-2',
    status: 'prevue', scheduled_date: today, start_time: '18:00',
    planned_hours: 2, notes: 'Accès après fermeture cabinet', priority: 'haute',
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    client: c1Clients[1], site: c1Sites[2], agents: [c1Agents[2]], sop: c1Sops[1],
  },
  {
    id: 'mission-3', company_id: C1, client_id: 'client-1', site_id: 'site-2',
    operational_item_id: null, service_type: 'nettoyage_parking', sop_id: null,
    status: 'prevue', scheduled_date: tomorrow, start_time: '07:00',
    planned_hours: 4, notes: null, priority: 'normale',
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    client: c1Clients[0], site: c1Sites[1], agents: [c1Agents[1], c1Agents[2]], sop: undefined,
  },
]

const c1Items: OperationalItem[] = [
  {
    id: 'op-1', company_id: C1, client_id: 'client-1', site_id: 'site-1',
    opportunity_id: null, source: 'contrat',
    title: 'Nettoyage quotidien - Immeuble Champs-Élysées',
    status: 'en_cours', priority: 'haute', notes: null,
    converted_to_mission: true, mission_id: 'mission-1',
    created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:00Z',
    client: c1Clients[0], site: c1Sites[0],
  },
  {
    id: 'op-2', company_id: C1, client_id: 'client-2', site_id: 'site-3',
    opportunity_id: null, source: 'contrat',
    title: 'Désinfection cabinet - soir',
    status: 'planifie', priority: 'haute', notes: 'Accès avec code 9876',
    converted_to_mission: false, mission_id: null,
    created_at: '2026-05-05T10:00:00Z', updated_at: '2026-05-05T10:00:00Z',
    client: c1Clients[1], site: c1Sites[2],
  },
  {
    id: 'op-3', company_id: C1, client_id: 'client-1', site_id: 'site-2',
    opportunity_id: null, source: 'demande_client',
    title: 'Nettoyage parking mensuel',
    status: 'a_organiser', priority: 'normale', notes: 'À planifier avant fin du mois',
    converted_to_mission: false, mission_id: null,
    created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z',
    client: c1Clients[0], site: c1Sites[1],
  },
]

const c1TimeEntries: TimeEntry[] = [
  {
    id: 'te-1', company_id: C1, mission_id: 'mission-1', agent_id: 'agent-1',
    client_id: 'client-1', site_id: 'site-1', date: today,
    planned_hours: 3, validated_hours: null, hourly_cost: 14, total_cost: null,
    status: 'a_valider', validated_at: null,
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    agent: c1Agents[0], mission: c1Missions[0], client: c1Clients[0], site: c1Sites[0],
  },
  {
    id: 'te-2', company_id: C1, mission_id: 'mission-2', agent_id: 'agent-3',
    client_id: 'client-2', site_id: 'site-3', date: today,
    planned_hours: 2, validated_hours: null, hourly_cost: 15, total_cost: null,
    status: 'prevue', validated_at: null,
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    agent: c1Agents[2], mission: c1Missions[1], client: c1Clients[1], site: c1Sites[2],
  },
]

// ─── Company 2 — ACME Cleaning (smaller dataset to prove tenant isolation) ──

const c2Agents: Agent[] = [
  {
    id: 'agent-4', company_id: C2, first_name: 'Sarah', last_name: 'Bennani',
    phone: '06 55 44 33 22', email: 'sarah.bennani@acme.example',
    specialty: 'Nettoyage hôtelier', skills: ['hôtellerie', 'nettoyage chambres'],
    business_registration_number: null, contract_type: 'cdi',
    weekly_availability_hours: 35,
    weekly_availability: { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: false },
    zone: 'Lyon centre', status: 'disponible', hourly_cost: 16, notes: null,
    created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'agent-5', company_id: C2, first_name: 'Tom', last_name: 'Garcia',
    phone: '06 77 88 99 00', email: 'tom.garcia@acme.example',
    specialty: 'Vitrerie', skills: ['vitrerie', 'travail en hauteur'],
    business_registration_number: '987654321', contract_type: 'auto_entrepreneur',
    weekly_availability_hours: 30,
    weekly_availability: { lundi: true, mardi: true, mercredi: true, jeudi: false, vendredi: true, samedi: false, dimanche: false },
    zone: 'Lyon banlieue', status: 'disponible', hourly_cost: 20, notes: null,
    created_at: '2026-03-15T10:00:00Z', updated_at: '2026-03-15T10:00:00Z',
  },
]

const c2Clients: Client[] = [
  {
    id: 'client-3', company_id: C2, name: 'Hôtel Bellevue Lyon',
    contact_name: 'Camille Roux', email: 'direction@bellevue-lyon.example', phone: '04 78 11 22 33',
    billing_address: '8 Place Bellecour', city: 'Lyon',
    client_type: 'entreprise', status: 'actif', notes: '120 chambres',
    created_from_opportunity_id: null,
    created_at: '2026-03-05T10:00:00Z', updated_at: '2026-03-05T10:00:00Z',
  },
]

const c2Sites: Site[] = [
  {
    id: 'site-4', company_id: C2, client_id: 'client-3',
    name: 'Hôtel Bellevue - Étages 1-5', address: '8 Place Bellecour', city: 'Lyon',
    surface_area: 2800, access_code: null, access_instructions: 'Badge remis à la réception',
    service_type: 'nettoyage_hotelier', frequency: 'quotidien', sop_id: null, notes: null,
    created_from_opportunity_id: null,
    created_at: '2026-03-05T10:00:00Z', updated_at: '2026-03-05T10:00:00Z',
  },
]

const c2Leads: Lead[] = [
  {
    id: 'lead-4', company_id: C2, company_name: 'Brasserie du Rhône',
    sector: 'Restauration', city: 'Lyon 2e',
    email: 'contact@brasserierhone.example', phone: '04 72 00 11 22', website: null,
    source: 'cold_outreach', ai_score: 68, probable_need: 'Nettoyage cuisine + salle',
    status: 'a_contacter', notes: null, converted_opportunity_id: null,
    created_at: '2026-05-09T10:00:00Z', updated_at: '2026-05-09T10:00:00Z',
  },
]

const c2Opportunities: Opportunity[] = [
  {
    id: 'opp-4', company_id: C2, lead_id: null, client_id: null, site_id: null,
    title: 'Nettoyage hôtel - Mercure Part-Dieu', prospect_name: 'Mercure Part-Dieu',
    contact_name: 'Olivier Petit', email: 'om.petit@mercure.example', phone: '04 78 99 88 77',
    city: 'Lyon 3e', site_address: '47 Bd Vivier Merle, Lyon',
    client_type: 'entreprise', service_type: 'nettoyage_hotelier',
    estimated_amount: 5200, stage: 'proposition',
    next_action_date: '2026-05-22T10:00:00Z', notes: 'Devis envoyé',
    status: 'ouvert', converted_to_client: false, converted_at: null,
    created_at: '2026-05-11T10:00:00Z', updated_at: '2026-05-11T10:00:00Z',
  },
]

const c2Sops: Sop[] = [
  {
    id: 'sop-3', company_id: C2, title: 'Nettoyage chambre hôtel',
    service_type: 'nettoyage_hotelier', estimated_duration_minutes: 30,
    required_skills: ['hôtellerie'],
    required_materials: ['chariot d\'étage', 'aspirateur'],
    required_products: ['multi-surfaces', 'détartrant sanitaires'],
    checklist_items: [
      { id: 'c1', text: 'Changer la literie' },
      { id: 'c2', text: 'Nettoyer salle de bain' },
      { id: 'c3', text: 'Réapprovisionner produits d\'accueil' },
      { id: 'c4', text: 'Aspirer et serpillière' },
    ],
    safety_instructions: 'Vérifier l\'absence du client.',
    notes: null,
    created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z',
  },
]

const c2Missions: Mission[] = [
  {
    id: 'mission-4', company_id: C2, client_id: 'client-3', site_id: 'site-4',
    operational_item_id: null, service_type: 'nettoyage_hotelier', sop_id: 'sop-3',
    status: 'prevue', scheduled_date: today, start_time: '09:00',
    planned_hours: 5, notes: null, priority: 'normale',
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    client: c2Clients[0], site: c2Sites[0], agents: [c2Agents[0]], sop: c2Sops[0],
  },
]

const c2Items: OperationalItem[] = [
  {
    id: 'op-4', company_id: C2, client_id: 'client-3', site_id: 'site-4',
    opportunity_id: null, source: 'contrat',
    title: 'Nettoyage étages Bellevue',
    status: 'planifie', priority: 'normale', notes: null,
    converted_to_mission: true, mission_id: 'mission-4',
    created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z',
    client: c2Clients[0], site: c2Sites[0],
  },
]

const c2TimeEntries: TimeEntry[] = [
  {
    id: 'te-3', company_id: C2, mission_id: 'mission-4', agent_id: 'agent-4',
    client_id: 'client-3', site_id: 'site-4', date: today,
    planned_hours: 5, validated_hours: null, hourly_cost: 16, total_cost: null,
    status: 'prevue', validated_at: null,
    created_at: '2026-05-13T10:00:00Z', updated_at: '2026-05-13T10:00:00Z',
    agent: c2Agents[0], mission: c2Missions[0], client: c2Clients[0], site: c2Sites[0],
  },
]

// ─── Exports (union across all tenants — pages filter via useCurrentCompanyId) ──

export const mockAgents: Agent[] = [...c1Agents, ...c2Agents]
export const mockClients: Client[] = [...c1Clients, ...c2Clients]
export const mockSites: Site[] = [...c1Sites, ...c2Sites]
export const mockLeads: Lead[] = [...c1Leads, ...c2Leads]
export const mockOpportunities: Opportunity[] = [...c1Opportunities, ...c2Opportunities]
export const mockSops: Sop[] = [...c1Sops, ...c2Sops]
export const mockMissions: Mission[] = [...c1Missions, ...c2Missions]
export const mockOperationalItems: OperationalItem[] = [...c1Items, ...c2Items]
export const mockTimeEntries: TimeEntry[] = [...c1TimeEntries, ...c2TimeEntries]
