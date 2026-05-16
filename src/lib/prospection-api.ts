export interface ProspectCandidate {
  id: string
  company_name: string
  siren: string
  siret: string | null
  sector: string
  naf_code: string | null
  city: string
  address: string | null
  company_type: string | null
  employee_range: string | null
  creation_date: string | null
  ai_score: number
  source: 'api_entreprises'
}

export interface ProspectionFilters {
  query: string
  department: string
  naf_code: string
  company_size: string
  count: number
}

// NAF codes relevant to cleaning services prospects
export const SECTEUR_OPTIONS = [
  { label: 'Tous secteurs', value: '' },
  { label: 'Restauration', value: '56' },
  { label: 'Hôtels & Hébergement', value: '55' },
  { label: 'Bureaux & Immobilier', value: '68' },
  { label: 'Santé & Médical', value: '86' },
  { label: 'Commerce de détail', value: '47' },
  { label: 'Enseignement', value: '85' },
  { label: 'Activités sportives', value: '93' },
  { label: 'Services aux entreprises', value: '82' },
  { label: 'Industrie manufacturière', value: '10' },
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
]

export const SIZE_OPTIONS = [
  { label: 'Toutes tailles', value: '' },
  { label: 'Micro (1-9 salariés)', value: 'micro' },
  { label: 'Petite (10-49 salariés)', value: 'petite' },
  { label: 'Moyenne (50-249 salariés)', value: 'moyenne' },
  { label: 'Grande (250+)', value: 'grande' },
]

const SIZE_TO_TRANCHE: Record<string, string[]> = {
  micro: ['01', '02', '03', '11', '12'],
  petite: ['21', '22', '31'],
  moyenne: ['41', '42', '51'],
  grande: ['52', '53'],
}

function computeAiScore(result: Record<string, unknown>, nafCode: string): number {
  let score = 50

  // Boost for sectors matching cleaning service prospects
  const cleaningTargetNaf = ['56', '55', '86', '68', '47', '85', '93']
  const actCode = (result.activite_principale as string | undefined) ?? ''
  if (nafCode && actCode.startsWith(nafCode.slice(0, 2))) score += 20
  else if (cleaningTargetNaf.some(n => actCode.startsWith(n))) score += 10

  // Boost for established companies
  const dateCreation = result.date_creation as string | undefined
  if (dateCreation) {
    const year = parseInt(dateCreation.split('-')[0])
    if (year < 2015) score += 10
    else if (year < 2020) score += 5
  }

  // Boost for PME category
  const cat = result.categorie_entreprise as string | undefined
  if (cat === 'PME') score += 10
  else if (cat === 'ETI') score += 5

  // Add slight randomness for realism
  score += Math.floor(Math.random() * 15) - 5

  return Math.min(100, Math.max(10, score))
}

function mapResultToProspect(result: Record<string, unknown>): ProspectCandidate {
  const siege = (result.siege as Record<string, unknown> | undefined) ?? {}
  const naf = (result.activite_principale as string | undefined) ?? null
  const score = computeAiScore(result, naf ?? '')

  return {
    id: crypto.randomUUID(),
    company_name: (result.nom_complet as string | undefined) ?? (result.nom_raison_sociale as string | undefined) ?? 'Entreprise inconnue',
    siren: (result.siren as string | undefined) ?? '',
    siret: (siege.siret as string | undefined) ?? null,
    sector: (result.libelle_activite_principale as string | undefined) ?? (siege.libelle_activite_principale as string | undefined) ?? '—',
    naf_code: naf,
    city: (siege.libelle_commune as string | undefined) ?? '—',
    address: (siege.geo_adresse as string | undefined) ?? null,
    company_type: (result.libelle_nature_juridique as string | undefined) ?? null,
    employee_range: (result.tranche_effectif_salarie as string | undefined) ?? null,
    creation_date: (result.date_creation as string | undefined) ?? null,
    ai_score: score,
    source: 'api_entreprises',
  }
}

export async function fetchProspects(filters: ProspectionFilters): Promise<ProspectCandidate[]> {
  const params = new URLSearchParams()

  const q = filters.query.trim() || 'entreprise'
  params.set('q', q)
  params.set('per_page', String(Math.min(filters.count, 25)))
  params.set('page', '1')
  params.set('etat_administratif', 'A') // Only active companies

  if (filters.department) params.set('departement', filters.department)
  if (filters.naf_code) params.set('activite_principale', filters.naf_code)

  if (filters.company_size) {
    const tranches = SIZE_TO_TRANCHE[filters.company_size]
    if (tranches) {
      params.set('tranche_effectif_salarie', tranches.join(','))
    }
  }

  const url = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

  if (!res.ok) throw new Error(`Erreur API : ${res.status} ${res.statusText}`)

  const data = await res.json() as { results?: Record<string, unknown>[] }
  const results = data.results ?? []

  return results
    .slice(0, filters.count)
    .map(mapResultToProspect)
    .sort((a, b) => b.ai_score - a.ai_score)
}
