'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { PieChart, Clock, Users, AlertTriangle } from 'lucide-react'

type AgentStats = {
  agentId: string
  agentName: string
  contractType: string
  weeklyCapacity: number
  plannedHours: number
  validatedHours: number
  cost: number
  variancePct: number | null
  utilizationPct: number | null
}

export default function AnalyseHeuresPage() {
  useEffect(() => { document.title = 'Analyse des heures — Proprely' }, [])
  const { agents, timeEntries } = useAppStore()
  const [filterMonth, setFilterMonth] = useState('')

  const filteredEntries = useMemo(() => {
    if (!filterMonth) return timeEntries
    return timeEntries.filter(te => te.date.startsWith(filterMonth))
  }, [timeEntries, filterMonth])

  const stats = useMemo<AgentStats[]>(() => {
    return agents.map(a => {
      const entries = filteredEntries.filter(te => te.agent_id === a.id)
      const plannedHours = entries.reduce((s, te) => s + (te.planned_hours ?? 0), 0)
      const validatedHours = entries.reduce((s, te) => s + (te.validated_hours ?? 0), 0)
      const cost = entries.reduce((s, te) => {
        const hours = te.validated_hours ?? te.planned_hours ?? 0
        const c = te.total_cost ?? (te.hourly_cost != null ? te.hourly_cost * hours : 0)
        return s + c
      }, 0)
      const variancePct = plannedHours > 0 ? ((validatedHours - plannedHours) / plannedHours) * 100 : null
      // Utilisation : si filtre mois, capacité ≈ 4 semaines ; sinon ratio sur la capacité hebdo seule
      const weeklyCapacity = a.weekly_availability_hours
      const capacityForPeriod = filterMonth ? weeklyCapacity * 4 : weeklyCapacity
      const utilizationPct = capacityForPeriod > 0
        ? ((validatedHours || plannedHours) / capacityForPeriod) * 100
        : null

      return {
        agentId: a.id,
        agentName: `${a.first_name} ${a.last_name}`,
        contractType: a.contract_type,
        weeklyCapacity,
        plannedHours,
        validatedHours,
        cost,
        variancePct,
        utilizationPct,
      }
    })
  }, [agents, filteredEntries, filterMonth])

  const sorted = [...stats].sort((a, b) => b.validatedHours - a.validatedHours)

  const totals = useMemo(() => ({
    planned: stats.reduce((s, x) => s + x.plannedHours, 0),
    validated: stats.reduce((s, x) => s + x.validatedHours, 0),
    cost: stats.reduce((s, x) => s + x.cost, 0),
  }), [stats])
  const globalVariance = totals.planned > 0 ? ((totals.validated - totals.planned) / totals.planned) * 100 : null
  const underutilized = stats.filter(s => s.utilizationPct != null && s.utilizationPct < 50).length

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Analyse des heures"
          description="Productivité, écarts prévu/réalisé et taux d'utilisation par agent"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
                <p className="text-xs text-slate-500">Agents suivis</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totals.validated.toFixed(1)}h</p>
                <p className="text-xs text-slate-500">Validées / {totals.planned.toFixed(1)}h prévues</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${globalVariance == null ? 'text-slate-400' : globalVariance > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                  {globalVariance == null ? '—' : `${globalVariance > 0 ? '+' : ''}${globalVariance.toFixed(1)}%`}
                </p>
                <p className="text-xs text-slate-500">Écart global</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{underutilized}</p>
                <p className="text-xs text-slate-500">Agents sous-utilisés (&lt;50%)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="filter-month" className="text-sm text-slate-600">Filtrer par mois :</label>
          <Input
            id="filter-month"
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="w-44"
          />
          {filterMonth && (
            <button
              type="button"
              onClick={() => setFilterMonth('')}
              className="text-xs text-indigo-600 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Capacité hebdo</TableHead>
                <TableHead className="text-right">Prévu</TableHead>
                <TableHead className="text-right">Validé</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Utilisation</TableHead>
                <TableHead className="text-right">Coût</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(s => (
                <TableRow key={s.agentId}>
                  <TableCell className="font-medium">{s.agentName}</TableCell>
                  <TableCell className="text-xs text-slate-500">{s.contractType}</TableCell>
                  <TableCell className="text-right">{s.weeklyCapacity}h</TableCell>
                  <TableCell className="text-right">{s.plannedHours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">{s.validatedHours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">
                    {s.variancePct == null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={s.variancePct > 5 ? 'text-red-600' : s.variancePct < -5 ? 'text-amber-600' : 'text-slate-600'}>
                        {s.variancePct > 0 ? '+' : ''}{s.variancePct.toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.utilizationPct == null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${s.utilizationPct > 90 ? 'bg-red-500' : s.utilizationPct > 70 ? 'bg-green-500' : s.utilizationPct > 40 ? 'bg-amber-400' : 'bg-slate-300'}`}
                            style={{ width: `${Math.min(100, s.utilizationPct)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 w-12 text-right">{s.utilizationPct.toFixed(0)}%</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.cost)}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Aucun agent à analyser
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="text-xs text-slate-400 mt-3">
          Le taux d&apos;utilisation est calculé sur la capacité hebdomadaire de l&apos;agent (×4 quand un mois est filtré). L&apos;écart compare les heures validées aux heures prévues.
        </p>
      </div>
    </AdminLayout>
  )
}
