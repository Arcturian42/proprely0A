'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/shared/StatCard'
import { Users, Euro, FileSignature, Calendar } from 'lucide-react'
import { useCompanyClients } from '@/lib/store'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function RentabiliteClientPage() {
  useEffect(() => {
    document.title = 'Rentabilité client — Proprely'
  }, [])

  const clients = useCompanyClients()
  const quotes = useAppStore((s) => s.quotes)
  const missions = useAppStore((s) => s.missions)
  const agents = useAppStore((s) => s.agents)
  const timeEntries = useAppStore((s) => s.timeEntries)
  const opportunities = useAppStore((s) => s.opportunities)

  const [from, setFrom] = useState(startOfYear())
  const [to, setTo] = useState(today())

  const stats = useMemo(() => {
    const agentCost = new Map(agents.map((a) => [a.id, a.hourly_cost ?? 0]))
    // quotes carry only client_name (snapshot) + opportunity_id — not client_id.
    // Resolve via the opportunity so two homonymous clients don't conflate
    // (matching by name alone would sum their revenue together).
    const opportunityClientId = new Map(
      opportunities.map((o) => [o.id, o.client_id]),
    )

    const rows = clients.map((client) => {
      const clientQuotes = quotes.filter((q) => {
        if (q.status !== 'signe' || !q.signed_at) return false
        if (q.signed_at < from || q.signed_at > to) return false
        const oppClientId = q.opportunity_id ? opportunityClientId.get(q.opportunity_id) : null
        if (oppClientId) return oppClientId === client.id
        // Fallback for orphan quotes (opportunity deleted or unset): match by
        // name. Imperfect on homonyms but the only signal left.
        return q.client_name === client.name
      })
      const revenueHt = clientQuotes.reduce((sum, q) => sum + (q.costs?.price_ht ?? 0), 0)
      const directCost = clientQuotes.reduce(
        (sum, q) => sum + (q.costs?.total_cost_ht ?? 0),
        0,
      )

      // Real labor cost from time entries on missions for this client
      const clientMissionIds = new Set(
        missions.filter((m) => m.client_id === client.id).map((m) => m.id),
      )
      const realLaborCost = timeEntries
        .filter(
          (e) =>
            clientMissionIds.has(e.mission_id ?? '') &&
            e.date >= from &&
            e.date <= to,
        )
        .reduce((sum, e) => {
          const cost = agentCost.get(e.agent_id) ?? 0
          return sum + (e.validated_hours ?? e.planned_hours ?? 0) * cost
        }, 0)

      const missionsCount = missions.filter(
        (m) =>
          m.client_id === client.id &&
          m.scheduled_date &&
          m.scheduled_date >= from &&
          m.scheduled_date <= to,
      ).length

      const margin = revenueHt - directCost
      const marginPct = revenueHt > 0 ? (margin / revenueHt) * 100 : 0

      return {
        client,
        revenueHt,
        directCost,
        realLaborCost,
        missionsCount,
        quotesSignedCount: clientQuotes.length,
        margin,
        marginPct,
      }
    })

    const filtered = rows.filter(
      (r) => r.revenueHt > 0 || r.missionsCount > 0,
    )
    filtered.sort((a, b) => b.revenueHt - a.revenueHt)

    const totals = filtered.reduce(
      (acc, r) => ({
        revenueHt: acc.revenueHt + r.revenueHt,
        directCost: acc.directCost + r.directCost,
        realLaborCost: acc.realLaborCost + r.realLaborCost,
        missionsCount: acc.missionsCount + r.missionsCount,
      }),
      { revenueHt: 0, directCost: 0, realLaborCost: 0, missionsCount: 0 },
    )

    return { rows: filtered, totals }
  }, [clients, quotes, missions, agents, timeEntries, opportunities, from, to])

  const globalMargin = stats.totals.revenueHt - stats.totals.directCost
  const globalMarginPct =
    stats.totals.revenueHt > 0
      ? Math.round((globalMargin / stats.totals.revenueHt) * 100)
      : 0

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <PageHeader
          title="Rentabilité par client"
          description="CA, coûts, marge brute par client sur une période"
        />

        <Card className="mb-6">
          <CardContent className="py-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label className="text-[12px]">Du</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[12px]">Au</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="CA HT"
            value={formatCurrency(stats.totals.revenueHt)}
            description="devis signés"
            icon={Euro}
          />
          <StatCard
            title="Coût direct"
            value={formatCurrency(stats.totals.directCost)}
            description="estimé sur devis"
            icon={FileSignature}
          />
          <StatCard
            title="Marge brute"
            value={formatCurrency(globalMargin)}
            description={`${globalMarginPct}% du CA`}
            icon={Users}
          />
          <StatCard
            title="Missions"
            value={stats.totals.missionsCount}
            description="sur la période"
            icon={Calendar}
          />
        </div>

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle className="text-base">Détail par client</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Devis signés</TableHead>
                  <TableHead className="text-right">Missions</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">Coût direct</TableHead>
                  <TableHead className="text-right">Main d&apos;œuvre réelle</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Aucun CA ni mission sur la période sélectionnée
                    </TableCell>
                  </TableRow>
                )}
                {stats.rows.map((r) => (
                  <TableRow key={r.client.id}>
                    <TableCell className="font-medium">{r.client.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.quotesSignedCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.missionsCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(r.revenueHt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      {formatCurrency(r.directCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      {formatCurrency(r.realLaborCost)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        r.marginPct >= 35
                          ? 'text-emerald-600'
                          : r.marginPct >= 20
                            ? 'text-amber-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(r.margin)}
                      <span className="text-[10px] ml-1">({r.marginPct.toFixed(0)}%)</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
