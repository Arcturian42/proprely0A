'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  fetchAgents,
  fetchClients,
  fetchSites,
  fetchLeads,
  fetchOpportunities,
  fetchMissions,
  fetchOperationalItems,
  fetchSops,
  fetchTimeEntries,
  fetchServiceTypes,
  fetchCompany,
} from '@/lib/db'

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

async function ensureUserRow() {
  // If the users table has no row for this user (old signup before trigger), fix it
  const res = await fetch('/api/auth/fix-user', { method: 'POST' })
  return res.ok
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Ensure user row exists before fetching data
    ensureUserRow().then(() => loadData())
  }, [])

  function loadData() {
    Promise.all([
      fetchAgents(),
      fetchClients(),
      fetchSites(),
      fetchLeads(),
      fetchOpportunities(),
      fetchMissions(),
      fetchOperationalItems(),
      fetchSops(),
      fetchTimeEntries(),
      fetchServiceTypes(),
      fetchCompany(),
    ]).then(([
      agents,
      clients,
      sites,
      leads,
      opportunities,
      missions,
      operationalItems,
      sops,
      timeEntries,
      serviceTypes,
      company,
    ]) => {
      const companySettings = company
        ? {
            id: company.id,
            name: company.name,
            email: company.email ?? '',
            phone: company.phone ?? '',
            address: company.address ?? '',
            siret: '',
          }
        : undefined

      useAppStore.getState().hydrate({
        agents,
        clients,
        sites,
        leads,
        opportunities,
        missions,
        operationalItems,
        sops,
        timeEntries,
        serviceTypes,
        ...(companySettings ? { companySettings } : {}),
      })

      setReady(true)
    }).catch((err) => {
      console.error('DataProvider: failed to hydrate store', err)
      setReady(true)
    })
  }

  if (!ready) return <LoadingSkeleton />
  return <>{children}</>
}
