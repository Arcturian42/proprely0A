'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, UserCog, Calendar, TrendingUp, Building2, FileText, X } from 'lucide-react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  useCompanyClients,
  useCompanyAgents,
  useCompanyMissions,
  useCompanyOpportunities,
  useAppStore,
} from '@/lib/store'

interface SearchResult {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
  group: 'Clients' | 'Agents' | 'Missions' | 'Opportunités' | 'Sites'
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const MAX_PER_GROUP = 5

/**
 * Cmd+K (Ctrl+K) global search. Reads the in-memory store — fast and offline-
 * friendly. Once we move to live Supabase queries we'll back this with a
 * tsvector + GIN index, but the API surface stays the same.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const clients = useCompanyClients()
  const agents = useCompanyAgents()
  const missions = useCompanyMissions()
  const opportunities = useCompanyOpportunities()
  const sites = useAppStore((s) => s.sites)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  const results = useMemo<SearchResult[]>(() => {
    const q = norm(query.trim())
    if (q.length < 2) return []
    const out: SearchResult[] = []

    for (const c of clients) {
      if (
        norm(c.name).includes(q) ||
        (c.contact_name && norm(c.contact_name).includes(q)) ||
        (c.email && norm(c.email).includes(q))
      ) {
        out.push({
          id: `c-${c.id}`,
          label: c.name,
          description: c.contact_name ?? c.email ?? c.city ?? 'Client',
          href: '/commercial/clients-sites',
          icon: <Users className="h-4 w-4 text-indigo-600" aria-hidden />,
          group: 'Clients',
        })
        if (out.filter((r) => r.group === 'Clients').length >= MAX_PER_GROUP) break
      }
    }

    for (const a of agents) {
      const full = `${a.first_name} ${a.last_name}`
      if (norm(full).includes(q) || (a.email && norm(a.email).includes(q))) {
        out.push({
          id: `a-${a.id}`,
          label: full,
          description: a.zone ?? a.email ?? 'Agent',
          href: '/rh/agents',
          icon: <UserCog className="h-4 w-4 text-emerald-600" aria-hidden />,
          group: 'Agents',
        })
        if (out.filter((r) => r.group === 'Agents').length >= MAX_PER_GROUP) break
      }
    }

    for (const o of opportunities) {
      if (
        (o.prospect_name && norm(o.prospect_name).includes(q)) ||
        (o.contact_name && norm(o.contact_name).includes(q)) ||
        (o.email && norm(o.email).includes(q)) ||
        (o.title && norm(o.title).includes(q))
      ) {
        out.push({
          id: `o-${o.id}`,
          label: o.prospect_name ?? o.title ?? 'Opportunité',
          description: `${o.stage} · ${o.city ?? '—'}`,
          href: '/commercial/pipeline',
          icon: <TrendingUp className="h-4 w-4 text-amber-600" aria-hidden />,
          group: 'Opportunités',
        })
        if (out.filter((r) => r.group === 'Opportunités').length >= MAX_PER_GROUP) break
      }
    }

    for (const m of missions) {
      const label =
        m.client?.name ?? m.site?.name ?? `Mission du ${m.scheduled_date}`
      if (
        (m.client && norm(m.client.name).includes(q)) ||
        (m.site && norm(m.site.name).includes(q)) ||
        (m.scheduled_date && m.scheduled_date.includes(q))
      ) {
        out.push({
          id: `m-${m.id}`,
          label,
          description: `${m.scheduled_date ?? '—'} · ${m.status ?? ''}`,
          href: '/operations/planning',
          icon: <Calendar className="h-4 w-4 text-sky-600" aria-hidden />,
          group: 'Missions',
        })
        if (out.filter((r) => r.group === 'Missions').length >= MAX_PER_GROUP) break
      }
    }

    for (const s of sites) {
      if (norm(s.name).includes(q) || (s.address && norm(s.address).includes(q))) {
        out.push({
          id: `s-${s.id}`,
          label: s.name,
          description: s.address ?? s.city ?? 'Site',
          href: '/commercial/clients-sites',
          icon: <Building2 className="h-4 w-4 text-slate-600" aria-hidden />,
          group: 'Sites',
        })
        if (out.filter((r) => r.group === 'Sites').length >= MAX_PER_GROUP) break
      }
    }

    return out
  }, [query, clients, agents, missions, opportunities, sites])

  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {}
    for (const r of results) {
      ;(map[r.group] = map[r.group] ?? []).push(r)
    }
    return map
  }, [results])

  function handleSelect(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Search className="h-4 w-4 text-slate-400" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, agent, mission, opportunité…"
            className="border-0 focus-visible:ring-0 px-0 h-7 text-[14px]"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-[13px] text-slate-400">
              Tape au moins 2 caractères pour rechercher.
            </div>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-slate-500">
              Aucun résultat pour «&nbsp;{query}&nbsp;».
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="py-1">
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-4 py-1">
                {group}
              </p>
              <ul>
                {items.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r.href)}
                      className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex-shrink-0">{r.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-slate-900 truncate">
                          {r.label}
                        </span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {r.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" aria-hidden />
            Recherche locale — clients, agents, missions, opportunités, sites
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="hover:text-slate-700"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
