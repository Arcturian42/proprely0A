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
import { Clock, Users, Euro, TrendingUp } from 'lucide-react'
import { useCompanyAgents } from '@/lib/store'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function AnalyseHeuresPage() {
  useEffect(() => {
    document.title = 'Analyse des heures — Proprely'
  }, [])

  const agents = useCompanyAgents()
  const timeEntries = useAppStore((s) => s.timeEntries)
  const missions = useAppStore((s) => s.missions)

  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())

  const stats = useMemo(() => {
    const inRange = timeEntries.filter(
      (e) => e.date >= from && e.date <= to,
    )

    const byAgent = new Map<
      string,
      {
        agentId: string
        firstName: string
        lastName: string
        hourlyCost: number
        plannedHours: number
        actualHours: number
        validatedHours: number
        missionsCount: Set<string>
      }
    >()

    for (const agent of agents) {
      byAgent.set(agent.id, {
        agentId: agent.id,
        firstName: agent.first_name,
        lastName: agent.last_name,
        hourlyCost: agent.hourly_cost ?? 0,
        plannedHours: 0,
        actualHours: 0,
        validatedHours: 0,
        missionsCount: new Set<string>(),
      })
    }

    for (const entry of inRange) {
      const row = byAgent.get(entry.agent_id)
      if (!row) continue
      const planned = entry.planned_hours ?? 0
      const actual = entry.validated_hours ?? planned
      row.plannedHours += planned
      row.actualHours += actual
      if (entry.status === 'validee') row.validatedHours += actual
      if (entry.mission_id) row.missionsCount.add(entry.mission_id)
    }

    // Add missions with no time entry as planned-only
    for (const mission of missions) {
      if (!mission.scheduled_date || mission.scheduled_date < from || mission.scheduled_date > to) continue
      for (const agent of mission.agents ?? []) {
        const row = byAgent.get(agent.id)
        if (!row) continue
        row.missionsCount.add(mission.id)
      }
    }

    const rows = Array.from(byAgent.values())
      .map((r) => ({
        ...r,
        missionsCount: r.missionsCount.size,
        laborCost: r.actualHours * r.hourlyCost,
      }))
      .sort((a, b) => b.actualHours - a.actualHours)

    const totals = rows.reduce(
      (acc, r) => ({
        plannedHours: acc.plannedHours + r.plannedHours,
        actualHours: acc.actualHours + r.actualHours,
        validatedHours: acc.validatedHours + r.validatedHours,
        laborCost: acc.laborCost + r.laborCost,
      }),
      { plannedHours: 0, actualHours: 0, validatedHours: 0, laborCost: 0 },
    )

    return { rows, totals }
  }, [agents, timeEntries, missions, from, to])

  const utilization =
    stats.totals.plannedHours > 0
      ? Math.round((stats.totals.actualHours / stats.totals.plannedHours) * 100)
      : 0

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <PageHeader
          title="Analyse des heures"
          description="Heures travaillées, écart prévu / réalisé, coût main-d'œuvre"
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
            title="Heures prévues"
            value={`${stats.totals.plannedHours.toFixed(1)}h`}
            description="sur la période"
            icon={Clock}
          />
          <StatCard
            title="Heures réalisées"
            value={`${stats.totals.actualHours.toFixed(1)}h`}
            description={`${stats.totals.validatedHours.toFixed(1)}h validées`}
            icon={TrendingUp}
          />
          <StatCard
            title="Taux d'utilisation"
            value={`${utilization}%`}
            description={
              utilization > 90 ? 'Charge forte' : utilization > 60 ? 'Normal' : 'Sous-utilisé'
            }
            icon={Users}
          />
          <StatCard
            title="Coût main-d'œuvre"
            value={formatCurrency(stats.totals.laborCost)}
            description="brut estimé"
            icon={Euro}
          />
        </div>

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle className="text-base">Détail par agent</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Prévu</TableHead>
                  <TableHead className="text-right">Réalisé</TableHead>
                  <TableHead className="text-right">Validé</TableHead>
                  <TableHead className="text-right">Missions</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Aucun agent ni heures sur la période sélectionnée
                    </TableCell>
                  </TableRow>
                )}
                {stats.rows.map((r) => {
                  const ecart = r.actualHours - r.plannedHours
                  const ecartPct = r.plannedHours > 0 ? (ecart / r.plannedHours) * 100 : 0
                  return (
                    <TableRow key={r.agentId}>
                      <TableCell className="font-medium">
                        {r.firstName} {r.lastName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.plannedHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.actualHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {r.validatedHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.missionsCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(r.laborCost)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          ecart > 0 ? 'text-rose-600' : ecart < 0 ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        {ecart > 0 ? '+' : ''}
                        {ecart.toFixed(1)}h
                        {r.plannedHours > 0 && (
                          <span className="text-[10px] ml-1">({ecartPct.toFixed(0)}%)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
