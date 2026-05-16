// ─── Scoring Engine — Nettoyage de Bureaux ────────────────────────────────────
// Algorithme en 5 dimensions : Effectif (40) + Secteur (30) + Localisation (15)
// + Maturité (10) + Signaux (5) = 100 pts max

export type LeadCategory = 'hot' | 'warm' | 'cool' | 'cold' | 'disqualified'

export interface ScoreBreakdown {
  effectif: number      // 0-40
  secteur: number       // 0-30
  localisation: number  // 0-15
  maturite: number      // 0-10
  signaux: number       // -5 to +5
  total: number         // 0-100
}

export interface ProspectCandidate {
  id: string
  company_name: string
  siren: string
  siret: string | null
  sector: string
  naf_code: string | null
  city: string
  address: string | null
  postal_code: string | null
  company_type: string | null
  employee_range: string | null
  employee_estimate: number | null
  creation_date: string | null
  is_siege: boolean
  nombre_etablissements: number
  surface_estimee_m2: number | null
  budget_min: number | null
  budget_max: number | null
  score: ScoreBreakdown
  category: LeadCategory
  recommandation: string
  source: 'api_entreprises'
  _isMock?: boolean
}

export interface ProspectionFilters {
  query: string
  department: string
  naf_code: string
  company_size: string
  score_min: number
  siege_only: boolean
  count: number
}

// ─── Référentiels ─────────────────────────────────────────────────────────────

export const SECTEUR_OPTIONS = [
  { label: 'Tous secteurs', value: '' },
  { label: 'Tech & Informatique', value: '62' },
  { label: 'Finance & Assurance', value: '64' },
  { label: 'Conseil & Juridique', value: '69' },
  { label: 'Architecture & Ingénierie', value: '71' },
  { label: 'Sièges sociaux & Holding', value: '70' },
  { label: 'Publicité & Communication', value: '73' },
  { label: 'Commerce de gros', value: '46' },
  { label: 'Commerce de détail', value: '47' },
  { label: 'Restauration', value: '56' },
  { label: 'Hôtels & Hébergement', value: '55' },
  { label: 'Immobilier', value: '68' },
  { label: 'Santé & Médical', value: '86' },
  { label: 'Enseignement', value: '85' },
  { label: 'Industrie manufacturière', value: '25' },
  { label: 'Logistique & Entreposage', value: '52' },
]

export const DEPARTMENT_OPTIONS = [
  { label: 'Tous départements', value: '' },
  { label: 'Paris (75)', value: '75' },
  { label: 'Seine-et-Marne (77)', value: '77' },
  { label: 'Yvelines (78)', value: '78' },
  { label: 'Essonne (91)', value: '91' },
  { label: 'Hauts-de-Seine (92)', value: '92' },
  { label: 'Seine-Saint-Denis (93)', value: '93' },
  { label: 'Val-de-Marne (94)', value: '94' },
  { label: "Val-d'Oise (95)", value: '95' },
  { label: 'Bouches-du-Rhône (13)', value: '13' },
  { label: 'Rhône (69)', value: '69' },
  { label: 'Nord (59)', value: '59' },
  { label: 'Gironde (33)', value: '33' },
  { label: 'Hérault (34)', value: '34' },
  { label: 'Loire-Atlantique (44)', value: '44' },
  { label: 'Haute-Garonne (31)', value: '31' },
  { label: 'Isère (38)', value: '38' },
]

export const SIZE_OPTIONS = [
  { label: 'Toutes tailles', value: '' },
  { label: '1-9 salariés', value: 'micro' },
  { label: '10-49 salariés', value: 'petite' },
  { label: '50-249 salariés', value: 'moyenne' },
  { label: '250+ salariés', value: 'grande' },
]

// Codes INSEE → tranches effectif
const SIZE_TO_TRANCHE: Record<string, string[]> = {
  micro: ['01', '02', '03'],
  petite: ['11', '12'],
  moyenne: ['21', '22', '31'],
  grande: ['32', '41', '42', '51', '52', '53'],
}

// Effectif midpoint par tranche INSEE pour estimations
const TRANCHE_MIDPOINT: Record<string, number> = {
  '01': 1.5, '02': 4, '03': 7.5,
  '11': 14.5, '12': 34,
  '21': 74, '22': 149, '31': 224, '32': 374,
  '41': 749, '42': 1499, '51': 3499, '52': 7499, '53': 15000,
}

// NAF à exclure (hard filter)
const EXCLUDED_NAF_PREFIXES = [
  '78.2', // Intérim
  '96.0', // Services personnels (coiffure, etc.)
  '97',   // Ménages employeurs
  '98',   // Ménages producteurs
  '99',   // Organisations extra-territoriales
]

// NAF qui indiquent un concurrent (pénalité signaux)
const COMPETITOR_NAF = ['81.2']

// Zones denses (fort potentiel opérationnel)
const DENSE_POSTAL_PREFIXES = ['75', '69', '33', '31', '59', '44', '34', '38', '06', '13', '67', '76']

// ─── Score Effectif (0-40 pts) ────────────────────────────────────────────────

function scoreEffectif(tranche: string | null): number {
  if (!tranche || tranche === 'NN' || tranche === '00') return 0
  const map: Record<string, number> = {
    '01': 5, '02': 10, '03': 15,
    '11': 25, '12': 35,
    '21': 40, '22': 40, '31': 40, '32': 40,
    '41': 35, '42': 30, '51': 25, '52': 20, '53': 15,
  }
  return map[tranche] ?? 0
}

// ─── Score Secteur (0-30 pts) ─────────────────────────────────────────────────

function scoreSecteur(nafCode: string | null): number {
  if (!nafCode) return 10 // neutre si inconnu

  const code = nafCode.replace('.', '').toUpperCase()
  const prefix2 = code.slice(0, 2)
  const prefix3 = code.slice(0, 3)

  // Tertiaire premium
  if (['62', '63', '64', '65', '66'].includes(prefix2)) return 30
  // Conseil, juridique, siège, design, pub, R&D
  if (['69', '70', '71', '72', '73', '74'].includes(prefix2)) return 25
  // Commerce gros/détail
  if (['46', '47'].includes(prefix2)) return 20
  // Industrie, logistique
  if (['10', '20', '25', '26', '27', '28', '29', '30', '33', '52'].includes(prefix2)) return 15
  // Santé, social
  if (['86', '87', '88'].includes(prefix2)) return 10
  // Éducation, administration publique
  if (['85', '84'].includes(prefix2)) return 10
  // Immobilier
  if (prefix2 === '68') return 15
  // Hôtellerie
  if (prefix2 === '55') return 8
  // Restauration
  if (prefix2 === '56') return 5
  // Déjà dans le nettoyage → concurrent
  if (prefix3 === '812') return -10

  return 8
}

// ─── Score Localisation (0-15 pts) ────────────────────────────────────────────

function scoreLocalisation(postalCode: string | null, isSiege: boolean): number {
  let score = 0
  if (isSiege) score += 10
  if (postalCode) {
    const prefix = postalCode.slice(0, 2)
    if (DENSE_POSTAL_PREFIXES.includes(prefix)) score += 5
  }
  return Math.min(15, score)
}

// ─── Score Maturité (0-10 pts) ────────────────────────────────────────────────

function scoreMaturite(dateCreation: string | null, nbEtablissements: number): number {
  let score = 0
  if (dateCreation) {
    const ageMois = (Date.now() - new Date(dateCreation).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (ageMois >= 36) score += 5
    else if (ageMois >= 12) score += 3
    else score += 1
  }
  if (nbEtablissements >= 2) score += 5
  return Math.min(10, score)
}

// ─── Score Signaux (−5 à +5 pts) ─────────────────────────────────────────────

function scoreSignaux(name: string, nafCode: string | null): number {
  let score = 0
  const nameLower = name.toLowerCase()

  if (/\b(siège|headquarters|hq|bureau|immeuble|centre d.affaires|tour )\b/i.test(nameLower)) score += 3
  if (/\b(clinique|hôpital|hopital|école|ecole|mairie|collectivité|communauté|communaute)\b/i.test(nameLower)) score -= 3

  if (nafCode) {
    const prefix3 = nafCode.replace('.', '').slice(0, 3).toUpperCase()
    if (COMPETITOR_NAF.some(c => prefix3.startsWith(c.replace('.', '')))) score -= 5
  }

  return Math.max(-5, Math.min(5, score))
}

// ─── Catégorie & Recommandation ───────────────────────────────────────────────

function getCategory(total: number): LeadCategory {
  if (total >= 85) return 'hot'
  if (total >= 70) return 'warm'
  if (total >= 50) return 'cool'
  if (total >= 30) return 'cold'
  return 'disqualified'
}

function getRecommandation(
  candidate: { category: LeadCategory; is_siege: boolean; city: string; sector: string; employee_estimate: number | null }
): string {
  const emp = candidate.employee_estimate ?? 0
  const suffix = emp > 0 ? ` (~${emp} salariés, ${candidate.city})` : ` (${candidate.city})`
  switch (candidate.category) {
    case 'hot':
      return `🔥 Priorité #1 — ${candidate.is_siege ? 'Appeler directement le décisionnaire au siège' : 'Appeler et proposer un audit gratuit'}${suffix}.`
    case 'warm':
      return `🟡 Priorité #2 — Email personnalisé + relance LinkedIn sous 3 jours${suffix}.`
    case 'cool':
      return `🟢 Priorité #3 — Inclure dans la séquence email automatisée (nurturing 4 semaines)${suffix}.`
    case 'cold':
      return `⚪ Priorité #4 — Base de données, re-scorer dans 3 mois${suffix}.`
    default:
      return `❌ Prospect non qualifié — secteur inadapté ou effectif insuffisant.`
  }
}

// ─── Estimations Business ─────────────────────────────────────────────────────

function estimateSurface(tranche: string | null): number | null {
  if (!tranche || tranche === 'NN' || tranche === '00') return null
  const midpoint = TRANCHE_MIDPOINT[tranche]
  if (!midpoint) return null
  return Math.round(midpoint * 12) // 12m² par salarié en moyenne
}

function estimateBudget(surface: number | null): { min: number; max: number } | null {
  if (!surface) return null
  return { min: Math.round(surface * 2), max: Math.round(surface * 4) }
}

// ─── Hard Filters ─────────────────────────────────────────────────────────────

function isExcluded(result: Record<string, unknown>): boolean {
  const siege = (result.siege as Record<string, unknown> | undefined) ?? {}
  const etat = (siege.etat_administratif as string | undefined) ?? (result.etat_administratif as string | undefined)
  if (etat && etat !== 'A') return true

  const tranche = (siege.tranche_effectif_salarie as string | undefined)
    ?? (result.tranche_effectif_salarie as string | undefined)
  if (tranche === 'NN' || tranche === '00') return true

  const naf = (siege.activite_principale as string | undefined)
    ?? (result.activite_principale as string | undefined)
    ?? ''
  if (EXCLUDED_NAF_PREFIXES.some(p => naf.startsWith(p.replace('.', '')))) return true

  return false
}

// ─── Mapper API → ProspectCandidate ──────────────────────────────────────────

function mapResult(result: Record<string, unknown>): ProspectCandidate {
  const siege = (result.siege as Record<string, unknown> | undefined) ?? {}

  const tranche = (siege.tranche_effectif_salarie as string | undefined)
    ?? (result.tranche_effectif_salarie as string | undefined)
    ?? null
  const naf = (siege.activite_principale as string | undefined)
    ?? (result.activite_principale as string | undefined)
    ?? null
  const name = (result.nom_complet as string | undefined)
    ?? (result.nom_raison_sociale as string | undefined)
    ?? 'Entreprise inconnue'
  const postalCode = (siege.code_postal as string | undefined) ?? null
  const isSiege = (siege.est_siege as boolean | undefined) ?? true
  const nbEtab = (result.nombre_etablissements as number | undefined) ?? 1
  const dateCreation = (result.date_creation as string | undefined)
    ?? (siege.date_creation as string | undefined) ?? null

  const effectifScore = scoreEffectif(tranche)
  const secteurScore = scoreSecteur(naf)
  const locScore = scoreLocalisation(postalCode, isSiege)
  const maturiteScore = scoreMaturite(dateCreation, nbEtab)
  const signauxScore = scoreSignaux(name, naf)
  const total = Math.min(100, Math.max(0, effectifScore + secteurScore + locScore + maturiteScore + signauxScore))

  const employeeEstimate = tranche ? Math.round(TRANCHE_MIDPOINT[tranche] ?? 0) || null : null
  const surface = estimateSurface(tranche)
  const budget = estimateBudget(surface)
  const category = getCategory(total)

  const partial = { category, is_siege: isSiege, city: (siege.libelle_commune as string | undefined) ?? '—', sector: (result.libelle_activite_principale as string | undefined) ?? '—', employee_estimate: employeeEstimate }

  return {
    id: crypto.randomUUID(),
    company_name: name,
    siren: (result.siren as string | undefined) ?? '',
    siret: (siege.siret as string | undefined) ?? null,
    sector: partial.sector,
    naf_code: naf,
    city: partial.city,
    address: (siege.geo_adresse as string | undefined) ?? null,
    postal_code: postalCode,
    company_type: (result.libelle_nature_juridique as string | undefined) ?? null,
    employee_range: tranche,
    employee_estimate: employeeEstimate,
    creation_date: dateCreation,
    is_siege: isSiege,
    nombre_etablissements: nbEtab,
    surface_estimee_m2: surface,
    budget_min: budget?.min ?? null,
    budget_max: budget?.max ?? null,
    score: { effectif: effectifScore, secteur: secteurScore, localisation: locScore, maturite: maturiteScore, signaux: signauxScore, total },
    category,
    recommandation: getRecommandation(partial),
    source: 'api_entreprises',
  }
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
// Données réalistes basées sur la structure Sirene pour démo / hors-ligne

const MOCK_COMPANIES = [
  { nom_complet: 'AGENCE CONSEIL VOLTA', siren: '552100554', activite_principale: '70.22Z', libelle_activite_principale: 'Conseil pour les affaires et autres conseils de gestion', libelle_nature_juridique: 'SA à conseil d\'administration', date_creation: '2010-03-15', nombre_etablissements: 3, tranche_effectif_salarie: '12', siege: { siret: '55210055400047', libelle_commune: 'PARIS', code_postal: '75008', geo_adresse: '12 RUE DE BERRI 75008 PARIS', activite_principale: '70.22Z', est_siege: true, tranche_effectif_salarie: '12' } },
  { nom_complet: 'CABINET MEDICO SAINT LAZARE', siren: '451209873', activite_principale: '86.21Z', libelle_activite_principale: 'Activité des médecins généralistes', libelle_nature_juridique: 'SELARL', date_creation: '2015-06-01', nombre_etablissements: 1, tranche_effectif_salarie: '11', siege: { siret: '45120987300012', libelle_commune: 'PARIS', code_postal: '75009', geo_adresse: '45 RUE SAINT LAZARE 75009 PARIS', activite_principale: '86.21Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'TECH SOLUTIONS DIGITALES', siren: '814309721', activite_principale: '62.01Z', libelle_activite_principale: 'Programmation informatique', libelle_nature_juridique: 'SAS', date_creation: '2018-01-10', nombre_etablissements: 2, tranche_effectif_salarie: '12', siege: { siret: '81430972100024', libelle_commune: 'BOULOGNE-BILLANCOURT', code_postal: '92100', geo_adresse: '8 AV PIERRE BROSSOLETTE 92100 BOULOGNE-BILLANCOURT', activite_principale: '62.01Z', est_siege: true, tranche_effectif_salarie: '12' } },
  { nom_complet: 'CABINET JURIDIQUE LEBLANC & ASSOCIES', siren: '380827394', activite_principale: '69.10Z', libelle_activite_principale: 'Activités juridiques', libelle_nature_juridique: 'SCP d\'avocats', date_creation: '2005-09-20', nombre_etablissements: 1, tranche_effectif_salarie: '11', siege: { siret: '38082739400018', libelle_commune: 'LYON', code_postal: '69002', geo_adresse: '23 RUE DE LA REPUBLIQUE 69002 LYON', activite_principale: '69.10Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'IMMO PATRIMOINE CONSEIL', siren: '529034817', activite_principale: '68.10Z', libelle_activite_principale: 'Activités des marchands de biens immobiliers', libelle_nature_juridique: 'SARL', date_creation: '2012-04-05', nombre_etablissements: 4, tranche_effectif_salarie: '21', siege: { siret: '52903481700034', libelle_commune: 'BORDEAUX', code_postal: '33000', geo_adresse: '15 COURS DE L\'INTENDANCE 33000 BORDEAUX', activite_principale: '68.10Z', est_siege: true, tranche_effectif_salarie: '21' } },
  { nom_complet: 'RESTAURANT LE GRAND PALAIS', siren: '412083940', activite_principale: '56.10A', libelle_activite_principale: 'Restauration traditionnelle', libelle_nature_juridique: 'SARL', date_creation: '2008-07-14', nombre_etablissements: 1, tranche_effectif_salarie: '03', siege: { siret: '41208394000022', libelle_commune: 'PARIS', code_postal: '75008', geo_adresse: '10 AV DES CHAMPS ELYSEES 75008 PARIS', activite_principale: '56.10A', est_siege: true, tranche_effectif_salarie: '03' } },
  { nom_complet: 'ASSURANCES MERIDIANE GROUPE', siren: '632109854', activite_principale: '65.12Z', libelle_activite_principale: 'Autres assurances', libelle_nature_juridique: 'SA à directoire', date_creation: '1998-02-28', nombre_etablissements: 12, tranche_effectif_salarie: '22', siege: { siret: '63210985400067', libelle_commune: 'PARIS LA DEFENSE', code_postal: '92800', geo_adresse: '1 PLACE DES COROLLES 92800 PARIS LA DEFENSE', activite_principale: '65.12Z', est_siege: true, tranche_effectif_salarie: '22' } },
  { nom_complet: 'CLINIQUE VETERINAIRE DU MARAIS', siren: '498271034', activite_principale: '75.00Z', libelle_activite_principale: 'Activités vétérinaires', libelle_nature_juridique: 'SAS', date_creation: '2016-11-30', nombre_etablissements: 1, tranche_effectif_salarie: '02', siege: { siret: '49827103400011', libelle_commune: 'PARIS', code_postal: '75004', geo_adresse: '8 RUE DU TEMPLE 75004 PARIS', activite_principale: '75.00Z', est_siege: true, tranche_effectif_salarie: '02' } },
  { nom_complet: 'LOGISTIQUE EXPRESS NORD', siren: '341782904', activite_principale: '52.10B', libelle_activite_principale: 'Entreposage et stockage non frigorifique', libelle_nature_juridique: 'SA', date_creation: '2003-05-16', nombre_etablissements: 5, tranche_effectif_salarie: '21', siege: { siret: '34178290400056', libelle_commune: 'LILLE', code_postal: '59800', geo_adresse: '45 RUE DU GENERAL DE GAULLE 59800 LILLE', activite_principale: '52.10B', est_siege: true, tranche_effectif_salarie: '21' } },
  { nom_complet: 'STUDIO DESIGN ATELIER ROUGE', siren: '823901274', activite_principale: '74.10Z', libelle_activite_principale: 'Activités spécialisées de design', libelle_nature_juridique: 'SAS', date_creation: '2019-09-01', nombre_etablissements: 1, tranche_effectif_salarie: '02', siege: { siret: '82390127400015', libelle_commune: 'MARSEILLE', code_postal: '13001', geo_adresse: '3 RUE DE LA PAIX 13001 MARSEILLE', activite_principale: '74.10Z', est_siege: true, tranche_effectif_salarie: '02' } },
  { nom_complet: 'HOLDING FINANCIERE DUPONT', siren: '201930475', activite_principale: '64.20Z', libelle_activite_principale: 'Activités des sociétés holding', libelle_nature_juridique: 'SA à conseil d\'administration', date_creation: '1994-01-01', nombre_etablissements: 8, tranche_effectif_salarie: '22', siege: { siret: '20193047500034', libelle_commune: 'PARIS', code_postal: '75016', geo_adresse: '23 AV VICTOR HUGO 75016 PARIS', activite_principale: '64.20Z', est_siege: true, tranche_effectif_salarie: '22' } },
  { nom_complet: 'AGENCE PUBLICITE LUMIERE', siren: '503928174', activite_principale: '73.11Z', libelle_activite_principale: 'Activités des agences de publicité', libelle_nature_juridique: 'SARL', date_creation: '2014-03-22', nombre_etablissements: 2, tranche_effectif_salarie: '11', siege: { siret: '50392817400028', libelle_commune: 'NANTES', code_postal: '44000', geo_adresse: '7 RUE CRÉBILLON 44000 NANTES', activite_principale: '73.11Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'CABINET COMPTABLE MERIDIEN', siren: '387294810', activite_principale: '69.20Z', libelle_activite_principale: 'Activités comptables', libelle_nature_juridique: 'SELAS', date_creation: '2007-08-11', nombre_etablissements: 3, tranche_effectif_salarie: '12', siege: { siret: '38729481000045', libelle_commune: 'TOULOUSE', code_postal: '31000', geo_adresse: '18 RUE ALSACE LORRAINE 31000 TOULOUSE', activite_principale: '69.20Z', est_siege: true, tranche_effectif_salarie: '12' } },
  { nom_complet: 'HOTEL CONTINENTAL SPA', siren: '567830291', activite_principale: '55.10Z', libelle_activite_principale: 'Hôtels et hébergement similaire', libelle_nature_juridique: 'SAS', date_creation: '2011-12-01', nombre_etablissements: 1, tranche_effectif_salarie: '12', siege: { siret: '56783029100017', libelle_commune: 'NICE', code_postal: '06000', geo_adresse: '4 PROMENADE DES ANGLAIS 06000 NICE', activite_principale: '55.10Z', est_siege: true, tranche_effectif_salarie: '12' } },
  { nom_complet: 'R&D PHARMA INNOVATIONS', siren: '720391084', activite_principale: '72.11Z', libelle_activite_principale: 'Recherche-développement en biotechnologie', libelle_nature_juridique: 'SAS', date_creation: '2020-06-15', nombre_etablissements: 1, tranche_effectif_salarie: '11', siege: { siret: '72039108400013', libelle_commune: 'GRENOBLE', code_postal: '38000', geo_adresse: '5 RUE AMPERE 38000 GRENOBLE', activite_principale: '72.11Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'ARCHITECTES URBANISTES DELTA', siren: '445629017', activite_principale: '71.11Z', libelle_activite_principale: "Activités d'architecture", libelle_nature_juridique: 'SCP', date_creation: '2009-03-30', nombre_etablissements: 2, tranche_effectif_salarie: '11', siege: { siret: '44562901700031', libelle_commune: 'STRASBOURG', code_postal: '67000', geo_adresse: '12 PLACE KLEBER 67000 STRASBOURG', activite_principale: '71.11Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'COMMERCE GROS TEXTILE LAMBERT', siren: '312847593', activite_principale: '46.41Z', libelle_activite_principale: 'Commerce de gros de textiles', libelle_nature_juridique: 'SARL', date_creation: '2001-10-05', nombre_etablissements: 3, tranche_effectif_salarie: '12', siege: { siret: '31284759300021', libelle_commune: 'LYON', code_postal: '69003', geo_adresse: '20 COURS LAFAYETTE 69003 LYON', activite_principale: '46.41Z', est_siege: true, tranche_effectif_salarie: '12' } },
  { nom_complet: 'STARTUP FINTECH PAYZEN', siren: '889234701', activite_principale: '66.19Z', libelle_activite_principale: 'Autres activités auxiliaires de services financiers', libelle_nature_juridique: 'SAS', date_creation: '2021-02-01', nombre_etablissements: 1, tranche_effectif_salarie: '11', siege: { siret: '88923470100018', libelle_commune: 'PARIS', code_postal: '75002', geo_adresse: '25 RUE DU LOUVRE 75002 PARIS', activite_principale: '66.19Z', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'CENTRE FORMATION PROFESIONNELLE AVENIR', siren: '428107659', activite_principale: '85.59B', libelle_activite_principale: 'Autres enseignements', libelle_nature_juridique: 'Association déclarée', date_creation: '2013-05-20', nombre_etablissements: 4, tranche_effectif_salarie: '11', siege: { siret: '42810765900044', libelle_commune: 'RENNES', code_postal: '35000', geo_adresse: '3 BD DE LA LIBERTE 35000 RENNES', activite_principale: '85.59B', est_siege: true, tranche_effectif_salarie: '11' } },
  { nom_complet: 'INDUSTRIE METALLIQUE PROVENCE', siren: '237810956', activite_principale: '25.11Z', libelle_activite_principale: 'Fabrication de structures métalliques', libelle_nature_juridique: 'SA', date_creation: '1988-07-01', nombre_etablissements: 6, tranche_effectif_salarie: '21', siege: { siret: '23781095600012', libelle_commune: 'MARSEILLE', code_postal: '13014', geo_adresse: '120 AV ROGER SALENGRO 13014 MARSEILLE', activite_principale: '25.11Z', est_siege: true, tranche_effectif_salarie: '21' } },
]

function generateMockProspects(filters: ProspectionFilters): ProspectCandidate[] {
  let pool = [...MOCK_COMPANIES]

  // Filter by NAF prefix
  if (filters.naf_code) {
    const prefix = filters.naf_code.slice(0, 2)
    const match = pool.filter(c => c.activite_principale.startsWith(prefix))
    if (match.length > 0) pool = match
  }

  // Filter by size
  if (filters.company_size) {
    const sizeMap: Record<string, string[]> = {
      micro: ['01', '02', '03'],
      petite: ['11', '12'],
      moyenne: ['21', '22', '31'],
      grande: ['32', '41'],
    }
    const allowed = sizeMap[filters.company_size] ?? []
    const match = pool.filter(c => allowed.includes(c.tranche_effectif_salarie))
    if (match.length > 0) pool = match
  }

  // Shuffle for variety
  pool = pool.sort(() => Math.random() - 0.5)

  return pool
    .slice(0, Math.min(25, pool.length))
    .map(mapResult)
    .filter(p => p.category !== 'disqualified' && p.score.total >= filters.score_min)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, filters.count)
}

// ─── Fetch (proxy → fallback mock) ────────────────────────────────────────────

export async function fetchProspects(filters: ProspectionFilters): Promise<ProspectCandidate[]> {
  const params = new URLSearchParams()
  params.set('q', filters.query.trim() || 'entreprise')
  if (filters.department) params.set('departement', filters.department)
  if (filters.naf_code) params.set('activite_principale', filters.naf_code)
  if (filters.company_size) params.set('company_size', filters.company_size)

  let results: Record<string, unknown>[] = []
  let usedMock = false

  try {
    const res = await fetch(`/api/prospection?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    })
    const data = await res.json() as { results?: Record<string, unknown>[]; error?: string }

    if (!res.ok || data.error || !data.results) {
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
    results = data.results
  } catch {
    // Fallback: données de démonstration réalistes
    usedMock = true
  }

  if (usedMock || results.length === 0) {
    const mock = generateMockProspects(filters)
    if (mock.length === 0) throw new Error('Aucun prospect trouvé. Élargissez vos critères.')
    return mock.map(p => ({ ...p, _isMock: true } as ProspectCandidate))
  }

  return results
    .filter(r => !isExcluded(r))
    .map(mapResult)
    .filter(p => {
      if (p.category === 'disqualified') return false
      if (p.score.total < filters.score_min) return false
      if (filters.siege_only && !p.is_siege) return false
      return true
    })
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, filters.count)
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<LeadCategory, { label: string; color: string; bg: string; border: string; dot: string }> = {
  hot:          { label: '🔥 HOT LEAD',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500' },
  warm:         { label: '🟡 WARM LEAD',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  cool:         { label: '🟢 COOL LEAD',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  cold:         { label: '⚪ COLD LEAD',   color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200',   dot: 'bg-slate-400' },
  disqualified: { label: '❌ Non qualifié', color: 'text-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-100',   dot: 'bg-slate-300' },
}

export function formatBudget(min: number | null, max: number | null): string | null {
  if (!min || !max) return null
  return `${min.toLocaleString('fr-FR')}€ – ${max.toLocaleString('fr-FR')}€ / mois`
}

export function formatSiren(siren: string): string {
  return siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

export const TRANCHE_LABEL: Record<string, string> = {
  '01': '1-2 salariés', '02': '3-5', '03': '6-9',
  '11': '10-19', '12': '20-49',
  '21': '50-99', '22': '100-199', '31': '200-249', '32': '250-499',
  '41': '500-999', '42': '1 000-1 999', '51': '2 000-4 999',
  '52': '5 000-9 999', '53': '10 000+',
}
