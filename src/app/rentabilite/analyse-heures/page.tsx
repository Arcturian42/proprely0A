'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function AnalyseHeuresPage() {
  useEffect(() => { document.title = 'Analyse des heures — Proprely' }, [])
  const { agents, timeEntries, clients } = useAppStore()
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')

  const filtered = useMemo(() => {
    return timeEntries.filter(te => {
      const matchMonth = selectedMonth === 'all' || te.date.startsWith(selectedMonth)
      const matchAgent = selectedAgent === 'all' || te.agent_id === selectedAgent
      return matchMonth && matchAgent
    })
  }, [timeEntries, selectedMonth, selectedAgent])

  const totalPrevu = filtered.reduce((s, te) => s + te.planned_hours, 0)
  const totalValide = filtered.filter(te => te.status === 'validee').reduce((s, te) => s + (te.validated_hours || te.planned_hours), 0)
  const totalCout = filtered.filter(te => te.status === 'validee').reduce((s, te) => s + (te.total_cost || 0), 0)
  const ecart = totalValide - totalPrevu
  const tauxValidation = filtered.length > 0
    ? (filtered.filter(te => te.status === 'validee').length / filtered.length) * 100
    : 0

  const byAgent = useMemo(() => {
    return agents.map(agent => {
      const entries = filtered.filter(te => te.agent_id === agent.id)
      const prevu = entries.reduce((s, te) => s + te.planned_hours, 0)
      const valide = entries.filter(te => te.status === 'validee').reduce((s, te) => s + (te.validated_hours || te.planned_hours), 0)
      const cout = entries.filter(te => te.status === 'validee').reduce((s, te) => s + (te.total_cost || 0), 0)
      const ecartAgent = valide - prevu
      return {
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`,
        prevu,
        valide,
        ecart: ecartAgent,
        cout,
        nbEntries: entries.length,
        validees: entries.filter(te => te.status === 'validee').length,
      }
    }).filter(a => a.nbEntries > 0).sort((a, b) => b.prevu - a.prevu)
  }, [agents, filtered])

  const byClient = useMemo(() => {
    return clients.map(client => {
      const entries = filtered.filter(te => te.client_id === client.id)
      const prevu = entries.reduce((s, te) => s + te.planned_hours, 0)
      const valide = entries.filter(te => te.status === 'validee').reduce((s, te) => s + (te.validated_hours || te.planned_hours), 0)
      const cout = entries.filter(te => te.status === 'validee').reduce((s, te) => s + (te.total_cost || 0), 0)
      return { id: client.id, name: client.name, prevu, valide, cout, nbEntries: entries.length }
    }).filter(c => c.nbEntries > 0).sort((a, b) => b.prevu - a.prevu)
  }, [clients, filtered])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    timeEntries.forEach(te => {
      if (te.date) months.add(te.date.substring(0, 7))
    })
    return Array.from(months).sort().reverse()
  }, [timeEntries])

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Analyse des heures"
          description="Suivi des heures prévues vs réalisées par agent et par client"
        />

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les périodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              {availableMonths.map(m => {
                const [year, month] = m.split('-')
                return <SelectItem key={m} value={m}>{MONTHS[parseInt(month) - 1]} {year}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500">Heures prévues</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalPrevu.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-xs text-slate-500">Heures validées</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{totalValide.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className={`w-4 h-4 ${Math.abs(ecart) > 5 ? 'text-red-400' : 'text-slate-400'}`} />
                <p className="text-xs text-slate-500">Écart prévu/réel</p>
              </div>
              <p className={`text-2xl font-bold ${ecart > 0 ? 'text-amber-600' : ecart < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {ecart >= 0 ? '+' : ''}{ecart.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-500">Coût total validé</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCout)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Par agent */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Par agent</h3>
            {byAgent.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-400">Aucune donnée</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Agent</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Prévues</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Réalisées</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Écart</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Coût</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {byAgent.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                              {a.name[0]}
                            </div>
                            <span className="font-medium text-slate-800 text-xs">{a.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">{a.prevu.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">{a.valide.toFixed(1)}h</td>
                        <td className={`px-4 py-3 text-right text-xs font-semibold ${a.ecart > 0.5 ? 'text-amber-600' : a.ecart < -0.5 ? 'text-red-600' : 'text-green-600'}`}>
                          {a.ecart >= 0 ? '+' : ''}{a.ecart.toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">{formatCurrency(a.cout)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-900">Total</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-900">{totalPrevu.toFixed(1)}h</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-900">{totalValide.toFixed(1)}h</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${ecart >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{ecart >= 0 ? '+' : ''}{ecart.toFixed(1)}h</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-900">{formatCurrency(totalCout)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Par client */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Par client</h3>
            {byClient.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-400">Aucune donnée</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Client</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Prévues</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Réalisées</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Coût</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {byClient.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {c.name[0]}
                            </div>
                            <span className="font-medium text-slate-800 text-xs">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">{c.prevu.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">{c.valide.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">{formatCurrency(c.cout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Taux de validation */}
        <div className="mt-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Taux de validation des heures</h3>
              <span className={`text-sm font-bold ${tauxValidation >= 80 ? 'text-green-600' : tauxValidation >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {tauxValidation.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tauxValidation >= 80 ? 'bg-green-500' : tauxValidation >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${tauxValidation}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {filtered.filter(te => te.status === 'validee').length} entrées validées sur {filtered.length} au total
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
