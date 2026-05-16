'use client'

import { usePipelineStore } from '@/lib/pipeline-store'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Target, Clock, DollarSign, FileText } from 'lucide-react'

export function PipelineStats() {
  const leads = usePipelineStore(s => s.leads)
  const quotes = usePipelineStore(s => s.quotes)

  const total = leads.length
  const won = leads.filter(l => l.status === 'gagne').length
  const lost = leads.filter(l => l.status === 'perdu').length
  const active = leads.filter(l => !['gagne', 'perdu', 'archive'].includes(l.status))
  const conversionRate = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0

  const pipelineValue = active.reduce((s, l) => s + (l.value_monthly ?? 0) * 12, 0)
  const avgDealSize = active.length > 0
    ? active.reduce((s, l) => s + (l.value_monthly ?? 0), 0) / active.length
    : 0

  const sentQuotes = quotes.filter(q => ['envoye', 'signe'].includes(q.status)).length
  const signedQuotes = quotes.filter(q => q.status === 'signe').length
  const quoteRate = sentQuotes > 0 ? Math.round((signedQuotes / sentQuotes) * 100) : 0

  const stats = [
    { icon: Target, label: 'Taux de conversion', value: `${conversionRate}%`, sub: `${won} gagnés / ${lost} perdus` },
    { icon: DollarSign, label: 'Pipeline total', value: formatCurrency(pipelineValue), sub: `${active.length} opportunités actives` },
    { icon: TrendingUp, label: 'Panier moyen', value: formatCurrency(avgDealSize) + '/m', sub: 'par opportunité active' },
    { icon: FileText, label: 'Devis signés', value: `${quoteRate}%`, sub: `${signedQuotes}/${sentQuotes} envoyés` },
    { icon: Clock, label: 'Temps moyen', value: '18j', sub: 'pour conclure' },
  ]

  return (
    <div className="border-t border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-8 overflow-x-auto">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-none">{s.label}</p>
              <p className="text-sm font-semibold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
