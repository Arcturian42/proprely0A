'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import type { CompanyDataSnapshot } from '@/app/actions/data'

/**
 * Pushes the server-fetched company data snapshot into the Zustand store on
 * mount. Runs once per page load (after auth resolution in the layout).
 *
 * Server fetch happens in app/layout.tsx via loadCompanyData() so the snapshot
 * arrives pre-baked — this component just does the synchronous set().
 */
export function SupabaseHydrator({ snapshot }: { snapshot: CompanyDataSnapshot | null }) {
  const hydrate = useAppStore(s => s.hydrateCompanyData)
  useEffect(() => {
    if (snapshot) hydrate(snapshot)
  }, [snapshot, hydrate])
  return null
}
