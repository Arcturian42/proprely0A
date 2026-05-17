'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Search, TrendingUp, Clock, Building2 } from 'lucide-react'

type ClientStats = {
  clientId: string
  clientName: string
  missionsCount: number
  plannedHours: number
  validatedHours: number
  totalCost: number
  estimatedRevenue: number
  margin: number
  marginPct: number | null
  variancePct: number | null
}

export default function RentabiliteClientPage() {
  useEffect(() => { document.title = 'Rentabilité client — Proprely' }, [])
  const { clients, missions, timeEntries, opportunities } = useAppStore()
  const [search, setSearch] = useState('')

  const stats = useMemo<ClientStats[]>(() => {
    return clients.map(c => {
      const clientMissions = missions.filter(m => m.client_id === c.id)
      const clientEntries = timeEntries.filter(te => te.client_id === c.id)
      const plannedHours = clientEntries.reduce((s, te) => s + (te.planned_hours ?? 0), 0)
      const validatedHours = clientEntries.reduce((s, te) => s + (te.validated_hours ?? 0), 0)
      const totalCost = clientEntries.reduce((s, te) => {
        const hours = te.validated_hours ?? te.planned_hours ?? 0
        const cost = te.total_cost ?? (te.hourly_cost != null ? te.hourly_cost * hours : 0)
        return s + cost
      }, 0)
      const wonOpps = opportunities.filter(o => o.client_id === c.id && o.converted_to_client)
      const estimatedRevenue = wonOpps.reduce((s, o) => s + (o.estimated_amount ?? 0), 0)
      const margin = estimatedRevenue - totalCost
      const marginPct = estimatedRevenue > 0 ? (margin / estimatedRevenue) * 100 : null
      const variancePct = plannedHours > 0 ? ((validatedHours - plannedHours) / plannedHours) * 100 : null

      return {
        clientId: c.id,
        clientName: c.name,
        missionsCount: clientMissions.length,
        plannedHours,
        validatedHours,
        totalCost,
        estimatedRevenue,
        margin,
        marginPct,
        variancePct,
      }
    })
  }, [clients, missions, timeEntries, opportunities])

  const filtered = useMemo(() => stats.filter(s =>
    !search || s.clientName.toLowerCase().includes(search.toLowerCase())
  ), [stats, search])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.totalCost - a.totalCost),
    [filtered],
  )

  const totals = useMemo(() => ({
    revenue: filtered.reduce((s, x) => s + x.estimatedRevenue, 0),
    cost: filtered.reduce((s, x) => s + x.totalCost, 0),
    hours: filtered.reduce((s, x) => s + x.validatedHours, 0),
  }), [filtered])
  const totalMargin = totals.revenue - totals.cost
  const totalMarginPct = totals.revenue > 0 ? (totalMargin / totals.revenue) * 100 : null

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Rentabilité client"
          description="Coût, revenu estimé et marge par client"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
                <p className="text-xs text-slate-500">Clients analysés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.revenue)}</p>
                <p className="text-xs text-slate-500">Revenu estimé</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(totals.cost)}</p>
                <p className="text-xs text-slate-500">Coût total ({totals.hours.toFixed(1)}h)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(totalMargin)}
                </p>
                <p className="text-xs text-slate-500">
                  Marge {totalMarginPct != null ? `(${totalMarginPct.toFixed(1)}%)` : '(n/a)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Rechercher un client"
          />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Missions</TableHead>
                <TableHead className="text-right">Heures (validées / prévues)</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
                <TableHead className="text-right">Marge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(s => (
                <TableRow key={s.clientId}>
                  <TableCell className="font-medium">{s.clientName}</TableCell>
                  <TableCell className="text-right">{s.missionsCount}</TableCell>
                  <TableCell className="text-right">
                    {s.validatedHours.toFixed(1)}h / {s.plannedHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right">
                    {s.variancePct == null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={s.variancePct > 5 ? 'text-red-600' : s.variancePct < -5 ? 'text-amber-600' : 'text-slate-600'}>
                        {s.variancePct > 0 ? '+' : ''}{s.variancePct.toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.totalCost)}</TableCell>
                  <TableCell className="text-right">
                    {s.estimatedRevenue > 0 ? formatCurrency(s.estimatedRevenue) : <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.marginPct == null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={s.margin >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(s.margin)} ({s.marginPct.toFixed(1)}%)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Aucun client à analyser
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="text-xs text-slate-400 mt-3">
          Le revenu est estimé à partir des opportunités gagnées liées au client. La marge est négative tant qu&apos;aucune opportunité gagnée n&apos;est rattachée.
        </p>
      </div>
    </AdminLayout>
  )
}
