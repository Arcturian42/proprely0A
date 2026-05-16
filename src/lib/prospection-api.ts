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

// ─── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchProspects(filters: ProspectionFilters): Promise<ProspectCandidate[]> {
  const params = new URLSearchParams()
  params.set('q', filters.query.trim() || 'bureau')
  params.set('per_page', '25') // Always fetch 25, then filter + sort
  params.set('page', '1')
  params.set('etat_administratif', 'A')

  if (filters.department) params.set('departement', filters.department)
  if (filters.naf_code) params.set('activite_principale', filters.naf_code)

  if (filters.company_size) {
    const tranches = SIZE_TO_TRANCHE[filters.company_size]
    if (tranches?.length) params.set('tranche_effectif_salarie', tranches.join(','))
  }

  const url = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`Erreur API Sirene : ${res.status} ${res.statusText}`)

  const data = await res.json() as { results?: Record<string, unknown>[] }
  const results = data.results ?? []

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
