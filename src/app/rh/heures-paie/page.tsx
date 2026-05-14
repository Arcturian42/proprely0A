'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { mockTimeEntries, mockAgents } from '@/lib/mock-data'
import { TimeEntry, TimeEntryStatus } from '@/types'
import { TIME_ENTRY_STATUS_LABELS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, Download, Filter } from 'lucide-react'
import { toast } from 'sonner'

export default function HeuresPaiePage() {
  const [entries, setEntries] = useState<TimeEntry[]>(mockTimeEntries)
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

  const handleValidate = (entry: TimeEntry) => {
    setSelectedEntry(entry)
    setValidatedHours(entry.planned_hours.toString())
  }

  const handleConfirmValidation = () => {
    if (!selectedEntry) return
    const hours = parseFloat(validatedHours)
    if (isNaN(hours) || hours <= 0) { toast.error('Heures invalides'); return }
    const cost = (entry => entry ? (entry.hourly_cost || 0) * hours : 0)(selectedEntry)
    setEntries(prev => prev.map(e => e.id === selectedEntry.id ? {
      ...e, validated_hours: hours, total_cost: cost, status: 'validee' as TimeEntryStatus,
      validated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } : e))
    toast.success(`${hours}h validées – coût: ${formatCurrency(cost)}`)
    setSelectedEntry(null)
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Agent', 'Client', 'Site', 'Heures prévues', 'Heures validées', 'Coût horaire', 'Coût total', 'Statut']
    const rows = filtered.map(e => [
      e.date,
      `${e.agent?.first_name} ${e.agent?.last_name}`,
      e.client?.name || '',
      e.site?.name || '',
      e.planned_hours,
      e.validated_hours || '',
      e.hourly_cost || '',
      e.total_cost || '',
      TIME_ENTRY_STATUS_LABELS[e.status] || e.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
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
      <div className="p-8">
        <PageHeader
          title="Heures & Paie"
          description="Suivi et validation des heures travaillées"
          action={
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          }
        />

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalPlanned.toFixed(1)}h</p>
              <p className="text-sm text-slate-500">Heures prévues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalValidated.toFixed(1)}h</p>
              <p className="text-sm text-slate-500">Heures validées</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalCost)}</p>
              <p className="text-sm text-slate-500">Coût total</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {mockAgents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(TIME_ENTRY_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="w-44"
          />
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Client / Site</TableHead>
                <TableHead>Prévu</TableHead>
                <TableHead>Validé</TableHead>
                <TableHead>Coût/h</TableHead>
                <TableHead>Coût total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        {entry.agent?.first_name?.[0]}
                      </div>
                      <span className="text-sm">{entry.agent?.first_name} {entry.agent?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{entry.client?.name}</p>
                    <p className="text-xs text-slate-500">{entry.site?.name}</p>
                  </TableCell>
                  <TableCell className="text-sm">{entry.planned_hours}h</TableCell>
                  <TableCell className="text-sm">
                    {entry.validated_hours ? (
                      <span className={entry.validated_hours !== entry.planned_hours ? 'text-amber-600 font-medium' : 'text-green-600'}>
                        {entry.validated_hours}h
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{entry.hourly_cost ? `${entry.hourly_cost} €` : '—'}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {entry.total_cost ? formatCurrency(entry.total_cost) : '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={entry.status} /></TableCell>
                  <TableCell>
                    {(entry.status === 'a_valider' || entry.status === 'prevue') && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleValidate(entry)}>
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> Valider
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Aucune entrée trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Validation dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Valider les heures</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedEntry.agent?.first_name} {selectedEntry.agent?.last_name}</p>
                <p className="text-slate-500">{selectedEntry.client?.name} – {selectedEntry.site?.name}</p>
                <p className="text-slate-500">Date: {formatDate(selectedEntry.date)}</p>
                <p className="text-slate-500">Prévu: {selectedEntry.planned_hours}h</p>
              </div>
              <div>
                <Label>Heures réalisées</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={validatedHours}
                  onChange={e => setValidatedHours(e.target.value)}
                />
              </div>
              {selectedEntry.hourly_cost && validatedHours && (
                <p className="text-sm text-slate-600">
                  Coût calculé: {formatCurrency(selectedEntry.hourly_cost * parseFloat(validatedHours))}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>Annuler</Button>
            <Button onClick={handleConfirmValidation}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
