'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { LeadSlideOver } from '@/components/pipeline/LeadSlideOver'
import { CreateLeadModal } from '@/components/pipeline/CreateLeadModal'
import { PipelineStats } from '@/components/pipeline/PipelineStats'
import { NotificationBell } from '@/components/pipeline/NotificationBell'
import { usePipelineStore } from '@/lib/pipeline-store'
import { PipelineLead } from '@/types/pipeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PipelinePage() {
  useEffect(() => { document.title = 'Pipeline — Proprely' }, [])

  const leads = usePipelineStore(s => s.leads)
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterAssigned, setFilterAssigned] = useState<string>('all')
  const [filterHasQuote, setFilterHasQuote] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const quotes = usePipelineStore(s => s.quotes)

  const filteredLeads = leads.filter(lead => {
    if (search) {
      const q = search.toLowerCase()
      if (!lead.company_name.toLowerCase().includes(q) &&
          !(lead.sector?.toLowerCase().includes(q)) &&
          !lead.assigned_to.toLowerCase().includes(q)) return false
    }
    if (filterPriority !== 'all' && lead.priority !== filterPriority) return false
    if (filterSource !== 'all' && lead.source !== filterSource) return false
    if (filterAssigned !== 'all' && lead.assigned_to !== filterAssigned) return false
    if (filterHasQuote === 'yes' && !quotes.some(q => q.lead_id === lead.id)) return false
    if (filterHasQuote === 'no' && quotes.some(q => q.lead_id === lead.id)) return false
    return true
  })

  const hasActiveFilters = search || filterPriority !== 'all' || filterSource !== 'all' || filterAssigned !== 'all' || filterHasQuote !== 'all'

  const clearFilters = () => {
    setSearch('')
    setFilterPriority('all')
    setFilterSource('all')
    setFilterAssigned('all')
    setFilterHasQuote('all')
  }

  const handleSelectLead = useCallback((lead: PipelineLead) => {
    setSelectedLead(lead)
  }, [])

  const handleSelectById = useCallback((id: string) => {
    const lead = leads.find(l => l.id === id)
    if (lead) setSelectedLead(lead)
  }, [leads])

  const handleCreated = useCallback((lead: PipelineLead) => {
    setSelectedLead(lead)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n' || e.key === 'N') setShowCreate(true)
      if (e.key === 'Escape' && selectedLead) setSelectedLead(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedLead])

  const assignees = [...new Set(leads.map(l => l.assigned_to))].filter(Boolean)

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen">
        {/* Top bar */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un lead..."
                className="pl-9 h-8 text-sm"
              />
            </div>

            {/* Filter toggle */}
            <Button
              size="sm"
              variant={showFilters ? 'secondary' : 'outline'}
              className={cn('gap-1.5 h-8', hasActiveFilters && 'border-blue-400 text-blue-700')}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3" />
              Filtres
              {hasActiveFilters && <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">!</span>}
            </Button>

            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1 h-8 text-slate-500">
                <X className="w-3 h-3" /> Effacer
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <NotificationBell onSelectLead={handleSelectById} />
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 h-8">
                <Plus className="w-4 h-4" /> Nouveau lead
              </Button>
            </div>
          </div>

          {/* Filters row */}
          {showFilters && (
            <div className="flex gap-2 mt-2 flex-wrap items-center pt-2 border-t border-slate-100">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Priorité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  <SelectItem value="chaud">🔴 Chaud</SelectItem>
                  <SelectItem value="tiede">🟡 Tiède</SelectItem>
                  <SelectItem value="froid">🔵 Froid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sources</SelectItem>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="website">Site web</SelectItem>
                  <SelectItem value="referral">Référence</SelectItem>
                  <SelectItem value="ai">IA</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Assigné à" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterHasQuote} onValueChange={setFilterHasQuote}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Devis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="yes">Avec devis</SelectItem>
                  <SelectItem value="no">Sans devis</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 ml-2">{filteredLeads.length} résultats</p>
            </div>
          )}
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-auto py-4">
          <KanbanBoard leads={filteredLeads} onSelectLead={handleSelectLead} />
        </div>

        {/* Stats bar */}
        <PipelineStats />
      </div>

      {/* Slide-over */}
      {selectedLead && (
        <LeadSlideOver
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Create lead modal */}
      <CreateLeadModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />
    </AdminLayout>
  )
}
