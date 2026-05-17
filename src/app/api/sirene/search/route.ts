import { NextResponse } from 'next/server'
import { requireAuthenticatedProfile } from '@/lib/supabase/server'

// Autocomplete-style company lookup against the public French SIRENE-based
// API (recherche-entreprises.api.gouv.fr — no auth, ~7 req/s anonymous).
// Used by the "New Opportunity" wizard, step 1.

export interface CompanyHit {
  siren: string
  siret: string | null
  name: string
  address: string | null
  city: string | null
  postal_code: string | null
  naf_code: string | null
  naf_label: string | null
  legal_form: string | null
  company_status: string | null
}

interface RawSiege {
  siret?: string
  geo_adresse?: string
  libelle_commune?: string
  code_postal?: string
  activite_principale?: string
  libelle_activite_principale?: string
  etat_administratif?: string
}

interface RawCompany {
  siren: string
  nom_complet?: string
  nom_raison_sociale?: string
  activite_principale?: string
  section_activite_principale?: string
  nature_juridique?: string
  etat_administratif?: string
  siege?: RawSiege
}

export async function GET(req: Request) {
  const gate = await requireAuthenticatedProfile()
  if (gate instanceof NextResponse) return gate

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const siret = url.searchParams.get('siret')?.trim()

  if (!q && !siret) return NextResponse.json({ results: [] })
  if (q && q.length < 2 && !siret) return NextResponse.json({ results: [] })

  const params = new URLSearchParams()
  params.set('per_page', '8')
  params.set('etat_administratif', 'A')
  params.set('q', siret || q || '')

  const endpoint = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { results: [], error: `Upstream ${res.status}` },
        { status: 200 },
      )
    }
    const data = (await res.json()) as { results?: RawCompany[] }
    const results: CompanyHit[] = (data.results || []).map(shape)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { results: [], error: (err as Error).message },
      { status: 200 },
    )
  }
}

function shape(r: RawCompany): CompanyHit {
  const siege = r.siege || {}
  return {
    siren: r.siren,
    siret: siege.siret || null,
    name: r.nom_complet || r.nom_raison_sociale || '',
    address: siege.geo_adresse || null,
    city: siege.libelle_commune || null,
    postal_code: siege.code_postal || null,
    naf_code: r.activite_principale || siege.activite_principale || null,
    naf_label: siege.libelle_activite_principale || r.section_activite_principale || null,
    legal_form: r.nature_juridique || null,
    company_status: r.etat_administratif === 'A' ? 'Active' : 'Inactive',
  }
}
