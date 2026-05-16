import { NextRequest, NextResponse } from 'next/server'

const SIRENE_BASE = 'https://recherche-entreprises.api.gouv.fr/search'

// Hard filters : NAF prefixes à exclure
const EXCLUDED_NAF = ['78.2', '96.0', '97', '98', '99', '81.2']

// Tranches effectif → taux de succès proxy
const SIZE_TO_TRANCHE: Record<string, string> = {
  micro: '01,02,03',
  petite: '11,12',
  moyenne: '21,22,31',
  grande: '32,41,42,51,52,53',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q') || 'entreprise'
  const department = searchParams.get('departement') || ''
  const nafCode = searchParams.get('activite_principale') || ''
  const companySize = searchParams.get('company_size') || ''

  const params = new URLSearchParams()
  params.set('q', query)
  params.set('per_page', '25')
  params.set('page', '1')

  if (department) params.set('departement', department)
  if (nafCode) params.set('activite_principale', nafCode)
  if (companySize && SIZE_TO_TRANCHE[companySize]) {
    params.set('tranche_effectif_salarie', SIZE_TO_TRANCHE[companySize])
  }

  const url = `${SIRENE_BASE}?${params.toString()}`

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `API Sirene : ${res.status} ${res.statusText}`, results: [] },
        { status: res.status }
      )
    }

    const data = await res.json() as { results?: Record<string, unknown>[]; total_results?: number }

    // Filter out excluded NAF codes and inactive companies server-side
    const filtered = (data.results ?? []).filter(r => {
      const siege = (r.siege as Record<string, unknown> | undefined) ?? {}
      const naf = (siege.activite_principale as string | undefined) ?? (r.activite_principale as string | undefined) ?? ''
      if (EXCLUDED_NAF.some(ex => naf.replace('.', '').startsWith(ex.replace('.', '')))) return false
      const tranche = (siege.tranche_effectif_salarie as string | undefined) ?? (r.tranche_effectif_salarie as string | undefined)
      if (tranche === 'NN' || tranche === '00') return false
      return true
    })

    return NextResponse.json({ results: filtered, total_results: data.total_results ?? filtered.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur réseau'
    return NextResponse.json({ error: msg, results: [] }, { status: 502 })
  }
}
