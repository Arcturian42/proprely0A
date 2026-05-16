'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  fetchAgents, fetchClients, fetchSites, fetchLeads, fetchOpportunities,
  fetchMissions, fetchOperationalItems, fetchSops, fetchTimeEntries,
  fetchServiceTypes, fetchCompany,
} from '@/lib/db'

// Module-level flag — survives re-renders and remounts within the same session
let initialized = false

async function ensureUserRow() {
  await fetch('/api/auth/fix-user', { method: 'POST' })
}

async function loadAllData() {
  const [agents, clients, sites, leads, opportunities, missions,
    operationalItems, sops, timeEntries, serviceTypes, company] = await Promise.all([
    fetchAgents(), fetchClients(), fetchSites(), fetchLeads(), fetchOpportunities(),
    fetchMissions(), fetchOperationalItems(), fetchSops(), fetchTimeEntries(),
    fetchServiceTypes(), fetchCompany(),
  ])

  useAppStore.getState().hydrate({
    agents, clients, sites, leads, opportunities, missions,
    operationalItems, sops, timeEntries, serviceTypes,
    ...(company ? {
      companySettings: {
        id: company.id,
        name: company.name,
        email: company.email ?? '',
        phone: company.phone ?? '',
        address: company.address ?? '',
        siret: '',
      }
    } : {}),
  })

  initialized = true
}

function LoadingSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#FBFBFA]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    </div>
  )
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  // If already initialized (e.g. component remounts), skip loading immediately
  const [ready, setReady] = useState(initialized)

  useEffect(() => {
    if (initialized) return
    ensureUserRow()
      .then(loadAllData)
      .catch((err) => console.error('DataProvider:', err))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <LoadingSkeleton />
  return <>{children}</>
}
