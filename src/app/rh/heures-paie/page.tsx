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
    toast.success(`${hours}h validées – coût: ${formatCurrency(cost)}`)
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
      <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A]">Heures & Paie</h1>
            <p className="text-[13px] text-[#94A3B8] mt-0.5">Suivi et validation des heures travaillées</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="h-9 px-4 bg-white border border-[#E2E8F0] text-[#475569] text-[13px] font-semibold rounded-[8px] flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'HEURES PRÉVUES', value: `${totalPlanned.toFixed(1)}h`, color: 'text-[#0F172A]' },
            { label: 'HEURES VALIDÉES', value: `${totalValidated.toFixed(1)}h`, color: 'text-emerald-600' },
            { label: 'EN ATTENTE', value: pendingCount, color: 'text-amber-600' },
            { label: 'COÛT TOTAL', value: formatCurrency(totalCost), color: 'text-[#6366F1]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-[12px] border border-[#E2E8F0] p-4 text-center">
              <p className={`text-[22px] font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-48">
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
            <SelectTrigger className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-40">
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
            className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-44 outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {['Date', 'Agent', 'Client / Site', 'Prévu', 'Validé', 'Coût/h', 'Coût total', 'Statut', 'Action'].map(h => (
                  <th key={h} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 text-[13px] text-[#475569] whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-[#6366F1] text-[11px] font-bold flex-shrink-0">
                        {entry.agent?.first_name?.[0]}
                      </div>
                      <span className="text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                        {entry.agent?.first_name} {entry.agent?.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#0F172A]">{entry.client?.name}</p>
                    <p className="text-[12px] text-[#94A3B8]">{entry.site?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A]">{entry.planned_hours}h</td>
                  <td className="px-4 py-3 text-[13px]">
                    {entry.validated_hours ? (
                      <span className={entry.validated_hours !== entry.planned_hours ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>
                        {entry.validated_hours}h
                      </span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#475569]">{entry.hourly_cost ? `${entry.hourly_cost} €` : <span className="text-[#94A3B8]">—</span>}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A]">
                    {entry.total_cost != null ? formatCurrency(entry.total_cost) : '0,00 €'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                  <td className="px-4 py-3">
                    {(entry.status === 'a_valider' || entry.status === 'prevue') && (
                      <button
                        onClick={() => handleValidate(entry)}
                        className="h-7 px-3 bg-emerald-50 text-emerald-700 text-[12px] font-semibold rounded-[6px] flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Valider
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[13px] text-[#94A3B8]">
                    Aucune entrée trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              <div className="bg-[#F8FAFC] rounded-[10px] p-4 text-[13px] space-y-1">
                <p className="font-semibold text-[#0F172A]">{selectedEntry.agent?.first_name} {selectedEntry.agent?.last_name}</p>
                <p className="text-[#94A3B8]">{selectedEntry.client?.name} – {selectedEntry.site?.name}</p>
                <p className="text-[#94A3B8]">Date: {formatDate(selectedEntry.date)}</p>
                <p className="text-[#94A3B8]">Prévu: {selectedEntry.planned_hours}h</p>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Heures réalisées</label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={validatedHours}
                  onChange={e => setValidatedHours(e.target.value)}
                  className="border border-[#E2E8F0] rounded-[8px] h-9 px-3 text-[13px] bg-white w-full outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                />
              </div>
              {selectedEntry.hourly_cost && validatedHours && (
                <p className="text-[13px] text-[#475569]">
                  Coût calculé: <span className="font-semibold text-[#0F172A]">{formatCurrency(selectedEntry.hourly_cost * parseFloat(validatedHours))}</span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>Annuler</Button>
            <button
              onClick={handleConfirmValidation}
              className="h-9 px-4 bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold rounded-[8px] transition-colors"
            >
              Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
