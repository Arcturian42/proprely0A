'use client'

import { useEffect, useMemo } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore, computeDevisTotal } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Users, Euro, BarChart3 } from 'lucide-react'

interface ClientMetrics {
  id: string
  name: string
  ca: number
  couts: number
  marge: number
  tauxMarge: number
  nbMissions: number
  nbFactures: number
}

export default function RentabiliteClientPage() {
  useEffect(() => { document.title = 'Rentabilité client — Proprely' }, [])
  const { clients, missions, timeEntries, factures } = useAppStore()

  const metrics: ClientMetrics[] = useMemo(() => {
    return clients.map(client => {
      const clientFactures = factures.filter(f => f.client_id === client.id && f.status === 'payee')
      const ca = clientFactures.reduce((sum, f) => {
        const { total } = computeDevisTotal(f.lines, f.tva_rate)
        return sum + total
      }, 0)

      const clientMissions = missions.filter(m => m.client_id === client.id)
      const clientEntries = timeEntries.filter(te => te.client_id === client.id && te.status === 'validee')
      const couts = clientEntries.reduce((sum, te) => sum + (te.total_cost || 0), 0)

      const marge = ca - couts
      const tauxMarge = ca > 0 ? (marge / ca) * 100 : 0

      return {
        id: client.id,
        name: client.name,
        ca,
        couts,
        marge,
        tauxMarge,
        nbMissions: clientMissions.length,
        nbFactures: clientFactures.length,
      }
    }).sort((a, b) => b.ca - a.ca)
  }, [clients, missions, timeEntries, factures])

  const totalCA = metrics.reduce((s, m) => s + m.ca, 0)
  const totalCouts = metrics.reduce((s, m) => s + m.couts, 0)
  const totalMarge = totalCA - totalCouts
  const tauxGlobal = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0

  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Rentabilité client"
          description="Analyse de la marge brute par client"
        />

        {/* Global KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Euro className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs text-slate-500">CA total encaissé</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCA)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-xs text-slate-500">Coût agents</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCouts)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${totalMarge >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {totalMarge >= 0
                    ? <TrendingUp className="w-4 h-4 text-green-600" />
                    : <TrendingDown className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-xs text-slate-500">Marge brute</p>
              </div>
              <p className={`text-2xl font-bold ${totalMarge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalMarge)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tauxGlobal >= 30 ? 'bg-green-100' : tauxGlobal >= 15 ? 'bg-amber-100' : 'bg-red-100'}`}>
                  <BarChart3 className={`w-4 h-4 ${tauxGlobal >= 30 ? 'text-green-600' : tauxGlobal >= 15 ? 'text-amber-600' : 'text-red-600'}`} />
                </div>
                <p className="text-xs text-slate-500">Taux de marge</p>
              </div>
              <p className={`text-2xl font-bold ${tauxGlobal >= 30 ? 'text-green-600' : tauxGlobal >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                {tauxGlobal.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client table */}
        {metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Aucune donnée disponible</p>
            <p className="text-sm text-slate-400 mt-1">Les données apparaîtront une fois des factures payées et des heures validées enregistrées</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CA encaissé</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coût agents</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Marge brute</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">% Marge</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Missions</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {metrics.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {m.name[0]}
                        </div>
                        <span className="font-medium text-slate-900">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900">{formatCurrency(m.ca)}</td>
                    <td className="px-5 py-4 text-right text-slate-600">{formatCurrency(m.couts)}</td>
                    <td className={`px-5 py-4 text-right font-semibold ${m.marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(m.marge)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.tauxMarge >= 30 ? 'bg-green-500' : m.tauxMarge >= 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(Math.max(m.tauxMarge, 0), 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-12 text-right ${m.tauxMarge >= 30 ? 'text-green-600' : m.tauxMarge >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                          {m.tauxMarge.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-500">{m.nbMissions}</td>
                    <td className="px-5 py-4 text-center">
                      {m.tauxMarge >= 30
                        ? <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />
                        : m.tauxMarge >= 15
                        ? <Minus className="w-4 h-4 text-amber-500 mx-auto" />
                        : <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-3 font-bold text-slate-900 text-sm">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(totalCA)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(totalCouts)}</td>
                  <td className={`px-5 py-3 text-right font-bold ${totalMarge >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalMarge)}</td>
                  <td className={`px-5 py-3 text-right font-bold ${tauxGlobal >= 30 ? 'text-green-600' : tauxGlobal >= 15 ? 'text-amber-600' : 'text-red-600'}`}>{tauxGlobal.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{metrics.reduce((s, m) => s + m.nbMissions, 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
