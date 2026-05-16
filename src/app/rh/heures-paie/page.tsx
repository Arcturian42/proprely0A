'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { TimeEntry, TimeEntryStatus } from '@/types'
import { TIME_ENTRY_STATUS_LABELS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function HeuresPaiePage() {
  useEffect(() => { document.title = 'Heures & Paie — Proprely' }, [])
  const { timeEntries: entries, updateTimeEntry, agents } = useAppStore()
  const [filterAgent, setFilterAgent] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [validatedHours, setValidatedHours] = useState('')

  const filtered = entries.filter(e => {
    const matchAgent = filterAgent === 'all' || e.agent_id === filterAgent
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    const matchMonth = !filterMonth || e.date.startsWith(filterMonth)
    return matchAgent && matchStatus && matchMonth
  })

  const totalPlanned = filtered.reduce((sum, e) => sum + e.planned_hours, 0)
  const totalValidated = filtered.reduce((sum, e) => sum + (e.validated_hours || 0), 0)
  const totalCost = filtered.reduce((sum, e) => sum + (e.total_cost || 0), 0)
  const pendingCount = filtered.filter(e => e.status === 'a_valider' || e.status === 'prevue').length
  const validatedCount = filtered.filter(e => e.status === 'validee').length

  const handleValidate = (entry: TimeEntry) => {
    setSelectedEntry(entry)
    setValidatedHours(entry.planned_hours.toString())
  }

  const handleConfirmValidation = () => {
    if (!selectedEntry) return
    const hours = parseFloat(validatedHours)
    if (isNaN(hours) || hours < 0 || hours > 12) { toast.error('Les heures doivent être entre 0 et 12h'); return }
    const cost = (entry => entry ? (entry.hourly_cost || 0) * hours : 0)(selectedEntry)
    updateTimeEntry(selectedEntry.id, {
      validated_hours: hours, total_cost: cost, status: 'validee' as TimeEntryStatus,
      validated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    toast.success('Heures validées avec succès')
    setSelectedEntry(null)
  }

  const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`

  const handleExportCSV = () => {
    const headers = ['Date', 'Agent', 'Client', 'Site', 'Heures prévues', 'Heures validées', 'Coût horaire', 'Coût total', 'Statut']
    const rows = filtered.map(e => [
      escapeCsv(e.date),
      escapeCsv(`${e.agent?.first_name} ${e.agent?.last_name}`),
      escapeCsv(e.client?.name || ''),
      escapeCsv(e.site?.name || ''),
      escapeCsv(String(e.planned_hours)),
      escapeCsv(String(e.validated_hours || '')),
      escapeCsv(String(e.hourly_cost || '')),
      escapeCsv(String(e.total_cost || '')),
      escapeCsv(TIME_ENTRY_STATUS_LABELS[e.status] || e.status),
    ])
    const csv = [headers.map(escapeCsv), ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heures-paie-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé')
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Heures & Paie</h1>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-2 self-start sm:self-auto">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Heures prévues', value: `${totalPlanned.toFixed(1)}h`, color: 'text-gray-900' },
            { label: 'Heures validées', value: `${totalValidated.toFixed(1)}h`, color: 'text-emerald-600' },
            { label: 'En attente', value: pendingCount, color: 'text-amber-600' },
            { label: 'Coût total', value: formatCurrency(totalCost), color: 'text-indigo-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(TIME_ENTRY_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="border border-gray-200 rounded-lg h-9 px-3 text-sm bg-white w-44 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Agent', 'Client / Site', 'Prévu', 'Validé', 'Coût/h', 'Coût total', 'Statut', 'Action'].map(h => (
                    <th key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {entry.agent?.first_name?.[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {entry.agent?.first_name} {entry.agent?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{entry.client?.name}</p>
                      <p className="text-xs text-gray-400">{entry.site?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{entry.planned_hours}h</td>
                    <td className="px-4 py-3 text-sm">
                      {entry.validated_hours ? (
                        <span className={entry.validated_hours !== entry.planned_hours ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>
                          {entry.validated_hours}h
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.hourly_cost ? `${entry.hourly_cost} €` : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {entry.total_cost != null ? formatCurrency(entry.total_cost) : '0,00 €'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                    <td className="px-4 py-3">
                      {(entry.status === 'a_valider' || entry.status === 'prevue') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7"
                          onClick={() => handleValidate(entry)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Valider
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-gray-400">
                      Aucune entrée trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Validation dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#0F172A]">Valider les heures</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-900">{selectedEntry.agent?.first_name} {selectedEntry.agent?.last_name}</p>
                <p className="text-gray-400">{selectedEntry.client?.name} – {selectedEntry.site?.name}</p>
                <p className="text-gray-400">Date: {formatDate(selectedEntry.date)}</p>
                <p className="text-gray-400">Prévu: {selectedEntry.planned_hours}h</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Heures réalisées</label>
                <input
                  type="number" min="0" max="12" step="0.5"
                  value={validatedHours}
                  onChange={e => setValidatedHours(e.target.value)}
                  className="border border-gray-200 rounded-lg h-9 px-3 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              {selectedEntry.hourly_cost && validatedHours && (
                <p className="text-sm text-gray-500">
                  Coût calculé: <span className="font-semibold text-gray-900">{formatCurrency(selectedEntry.hourly_cost * parseFloat(validatedHours))}</span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>Annuler</Button>
            <Button onClick={handleConfirmValidation} className="bg-indigo-600 hover:bg-indigo-700 text-white">Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
