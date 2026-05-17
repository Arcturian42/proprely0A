import { NextResponse } from 'next/server'
import { requireAuthenticatedProfile } from '@/lib/supabase/server'

// Maps the wizard "business category" to NAF activity codes used by the
// recherche-entreprises.api.gouv.fr API (SIRENE-based public dataset).
const CATEGORY_TO_NAF: Record<string, string[]> = {
  bureaux: ['70.10Z', '70.22Z', '69.10Z', '69.20Z', '68.20A', '68.20B'],
  copropriete: ['68.32A', '68.32B'],
  hotel: ['55.10Z', '55.20Z'],
  restaurant: ['56.10A', '56.10B', '56.10C', '56.29A', '56.29B'],
  industrie: ['10.11Z', '10.71B', '20.59Z', '22.29A', '25.11Z', '28.29B'],
  commerce: ['47.11D', '47.11F', '47.19B', '47.71Z', '47.91A'],
  fin_de_chantier: ['41.20A', '41.20B', '43.99C'],
  medical: ['86.10Z', '86.21Z', '86.22A', '86.22B', '86.22C', '86.23Z', '87.10A', '87.10B'],
  retail: ['47.11D', '47.71Z', '47.72A', '47.42Z', '47.43Z'],
  coworking: ['68.20A', '82.99Z'],
}

// SIRENE "tranche_effectif_salarie" codes grouped to wizard sizes.
const SIZE_TO_TRANCHES: Record<string, string[]> = {
  '1-10': ['01', '02', '03'],
  '10-50': ['11', '12'],
  '50-100': ['21'],
  '100+': ['22', '31', '32', '41', '42', '51', '52', '53'],
}

// Midpoint of the SIRENE employee bracket — used for downstream estimates.
const TRANCHE_MIDPOINT: Record<string, number> = {
  '00': 0, '01': 1, '02': 4, '03': 7, '11': 14, '12': 35,
  '21': 75, '22': 150, '31': 225, '32': 375, '41': 750,
  '42': 1500, '51': 3500, '52': 7500, '53': 12000,
}

interface SearchBody {
  category?: string
  size?: string
  surface?: string
  location?: { type?: 'city' | 'postcode' | 'departement' | 'region'; value?: string }
  quality?: string
  page?: number
  exclude?: string[]
  limit?: number
}

export async function POST(req: Request) {
  const gate = await requireAuthenticatedProfile()
  if (gate instanceof NextResponse) return gate

  let body: SearchBody = {}
  try { body = await req.json() } catch { /* ignore */ }

  const { category, size, location, quality, page = 1, exclude = [], limit = 5 } = body

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', '25')
  params.set('etat_administratif', 'A')

  if (location?.value) {
    const v = location.value.trim()
    if (location.type === 'postcode' || /^\d{5}$/.test(v)) params.set('code_postal', v)
    else if (location.type === 'departement' || /^\d{1,3}$/.test(v)) params.set('departement', v)
    else params.set('q', v)
  }

  const nafs = category ? CATEGORY_TO_NAF[category] : undefined
  if (nafs?.length) params.set('activite_principale', nafs.join(','))

  const tranches = size ? SIZE_TO_TRANCHES[size] : undefined
  if (tranches?.length) params.set('tranche_effectif_salarie', tranches.join(','))

  const url = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`

  let data: { results?: unknown[]; total_results?: number } = {}
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { leads: [], total: 0, error: `Upstream ${res.status}` },
        { status: 200 },
      )
    }
    data = await res.json()
  } catch (err) {
    return NextResponse.json(
      { leads: [], total: 0, error: (err as Error).message },
      { status: 200 },
    )
  }

  const excludeSet = new Set(exclude)
  const raw = (data.results || []) as RawEntreprise[]
  const leads = raw
    .filter((r) => !excludeSet.has(r.siren))
    .map((r) => buildLead(r, { category, quality }))
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, Math.max(1, Math.min(50, limit)))

  return NextResponse.json({ leads, total: data.total_results || 0 })
}

interface RawEntreprise {
  siren: string
  nom_complet?: string
  nom_raison_sociale?: string
  date_creation?: string
  tranche_effectif_salarie?: string
  activite_principale?: string
  section_activite_principale?: string
  nature_juridique?: string
  siege?: {
    siret?: string
    libelle_commune?: string
    code_postal?: string
    geo_adresse?: string
    departement?: string
    activite_principale?: string
    libelle_activite_principale?: string
  }
  matching_etablissements?: unknown[]
}

interface ProspectLead {
  id: string
  siren: string
  siret: string | null
  name: string
  sector: string | null
  naf: string | null
  city: string | null
  postcode: string | null
  address: string | null
  employees: number
  estimatedSurface: number
  estimatedMonthlyValue: number
  estimatedYearlyValue: number
  aiScore: number
  confidence: 'high' | 'medium' | 'low'
  createdAt: string | null
  ageYears: number | null
  website: string | null
  rating: number | null
  reasons: string[]
}

function buildLead(r: RawEntreprise, ctx: { category?: string; quality?: string }): ProspectLead {
  const siege = r.siege || {}
  const employees = TRANCHE_MIDPOINT[r.tranche_effectif_salarie || '00'] ?? 0
  const effective = employees > 0 ? employees : 8
  const estimatedSurface = Math.round(effective * 12) // ~12 m² / employee
  const pricePerSqm = 1.4 + Math.random() * 0.6 // 1.4-2.0 € / m² / month
  const estimatedMonthlyValue = Math.round(estimatedSurface * pricePerSqm)

  const ageMs = r.date_creation ? Date.now() - new Date(r.date_creation).getTime() : null
  const ageYears = ageMs !== null ? Math.round(ageMs / (365.25 * 24 * 3600 * 1000)) : null

  let score = 55
  if (employees >= 10) score += 8
  if (employees >= 50) score += 8
  if (employees >= 100) score += 6
  if (ageYears !== null && ageYears <= 2) score += 6
  if (ctx.category === 'medical' || ctx.category === 'hotel' || ctx.category === 'coworking') score += 5
  if (ctx.quality === 'newly_created' && ageYears !== null && ageYears <= 1) score += 12
  if (ctx.quality === 'growing' && employees >= 20) score += 8
  if (ctx.quality === 'high_end' && (ctx.category === 'hotel' || ctx.category === 'medical')) score += 6
  score = Math.min(99, Math.max(38, score + Math.floor(Math.random() * 6 - 1)))

  const reasons: string[] = []
  if (employees >= 50) reasons.push(`${employees}+ salariés — potentiel récurrent fort`)
  else if (employees >= 10) reasons.push(`${employees} salariés — taille type contrat hebdo`)
  if (ageYears !== null && ageYears <= 2) reasons.push('Société récente — fenêtre d\'acquisition')
  if (ctx.category) reasons.push(`Secteur cible: ${labelForCategory(ctx.category)}`)
  if (siege.libelle_commune) reasons.push(`Implanté à ${siege.libelle_commune}`)
  if (reasons.length === 0) reasons.push('Profil cohérent avec votre offre')

  return {
    id: r.siren,
    siren: r.siren,
    siret: siege.siret || null,
    name: r.nom_complet || r.nom_raison_sociale || 'Société',
    sector:
      siege.libelle_activite_principale ||
      r.section_activite_principale ||
      r.activite_principale ||
      null,
    naf: r.activite_principale || siege.activite_principale || null,
    city: siege.libelle_commune || null,
    postcode: siege.code_postal || null,
    address: siege.geo_adresse || null,
    employees,
    estimatedSurface,
    estimatedMonthlyValue,
    estimatedYearlyValue: estimatedMonthlyValue * 12,
    aiScore: score,
    confidence: score >= 78 ? 'high' : score >= 62 ? 'medium' : 'low',
    createdAt: r.date_creation || null,
    ageYears,
    website: null,
    rating: null,
    reasons: reasons.slice(0, 3),
  }
}

function labelForCategory(c: string): string {
  const m: Record<string, string> = {
    bureaux: 'Bureaux', copropriete: 'Copropriété', hotel: 'Hôtellerie',
    restaurant: 'Restauration', industrie: 'Industrie', commerce: 'Commerce',
    fin_de_chantier: 'Fin de chantier', medical: 'Médical', retail: 'Retail',
    coworking: 'Coworking',
  }
  return m[c] || c
}
