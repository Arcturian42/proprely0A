'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, MapPin, Euro, CheckCircle2, Calendar, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { CardDetailPanel } from '@/components/commercial/CardDetailPanel'

const STAGES: OpportunityStage[] = ['ouvert', 'decouverte', 'proposition', 'negociation', 'gagne', 'perdu']

const STAGE_CONFIG: Record<OpportunityStage, {
  gradient: string
  dot: string
  headerBg: string
  headerText: string
  cardBorder: string
  cardHover: string
  emptyBg: string
}> = {
  ouvert: {
    gradient: 'from-slate-500/10 to-slate-400/5',
    dot: 'bg-slate-400',
    headerBg: 'bg-slate-50 border-slate-200',
    headerText: 'text-slate-700',
    cardBorder: 'border-slate-200/80',
    cardHover: 'hover:border-slate-300 hover:shadow-slate-200/50',
    emptyBg: 'bg-slate-50/50',
  },
  decouverte: {
    gradient: 'from-blue-500/10 to-blue-400/5',
    dot: 'bg-blue-400',
    headerBg: 'bg-blue-50 border-blue-200',
    headerText: 'text-blue-700',
    cardBorder: 'border-blue-100',
    cardHover: 'hover:border-blue-200 hover:shadow-blue-100/50',
    emptyBg: 'bg-blue-50/30',
  },
  proposition: {
    gradient: 'from-violet-500/10 to-violet-400/5',
    dot: 'bg-violet-400',
    headerBg: 'bg-violet-50 border-violet-200',
    headerText: 'text-violet-700',
    cardBorder: 'border-violet-100',
    cardHover: 'hover:border-violet-200 hover:shadow-violet-100/50',
    emptyBg: 'bg-violet-50/30',
  },
  negociation: {
    gradient: 'from-amber-500/10 to-amber-400/5',
    dot: 'bg-amber-400',
    headerBg: 'bg-amber-50 border-amber-200',
    headerText: 'text-amber-700',
    cardBorder: 'border-amber-100',
    cardHover: 'hover:border-amber-200 hover:shadow-amber-100/50',
    emptyBg: 'bg-amber-50/30',
  },
  gagne: {
    gradient: 'from-green-500/10 to-emerald-400/5',
    dot: 'bg-green-500',
    headerBg: 'bg-green-50 border-green-200',
    headerText: 'text-green-700',
    cardBorder: 'border-green-100',
    cardHover: 'hover:border-green-200 hover:shadow-green-100/50',
    emptyBg: 'bg-green-50/30',
  },
  perdu: {
    gradient: 'from-red-500/10 to-red-400/5',
    dot: 'bg-red-400',
    headerBg: 'bg-red-50 border-red-200',
    headerText: 'text-red-600',
    cardBorder: 'border-red-100',
    cardHover: 'hover:border-red-200 hover:shadow-red-100/50',
    emptyBg: 'bg-red-50/20',
  },
}

const defaultForm = {
  title: '',
  prospect_name: '',
  contact_name: '',
  email: '',
  phone: '',
  city: '',
  site_address: '',
  client_type: '',
  service_type: '',
  estimated_amount: '',
  stage: 'ouvert' as OpportunityStage,
  next_action_date: '',
  notes: '',
}

// Droppable column
function KanbanColumn({
  stage,
  opportunities,
  onCardClick,
  onAddCard,
  isDraggingOver,
}: {
  stage: OpportunityStage
  opportunities: Opportunity[]
  onCardClick: (opp: Opportunity) => void
  onAddCard: (stage: OpportunityStage) => void
  isDraggingOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: stage })
  const config = STAGE_CONFIG[stage]
  const total = opportunities.reduce((sum, o) => sum + (o.estimated_amount || 0), 0)

  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col gap-2">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${config.headerBg} transition-all`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-semibold ${config.headerText}`}>
            {OPPORTUNITY_STAGE_LABELS[stage]}
          </span>
          <span className="text-xs text-slate-400 bg-white/60 px-1.5 py-0.5 rounded-full">
            {opportunities.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {total > 0 && (
            <span className="text-xs font-medium text-slate-500">{formatCurrency(total)}</span>
          )}
          <button
            onClick={() => onAddCard(stage)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] space-y-2.5 rounded-xl p-2 transition-all duration-200 ${
          isDraggingOver
            ? `bg-gradient-to-b ${config.gradient} border-2 border-dashed border-current opacity-80`
            : 'bg-transparent'
        }`}
      >
        {opportunities.map((opp) => (
          <KanbanCard
            key={opp.id}
            opportunity={opp}
            stage={stage}
            onClick={() => onCardClick(opp)}
          />
        ))}

        {opportunities.length === 0 && !isDraggingOver && (
          <div className={`${config.emptyBg} rounded-xl p-5 text-center border-2 border-dashed border-slate-200/70`}>
            <p className="text-xs text-slate-400">Aucune opportunité</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Draggable card — listeners on root element so pointer events reach @dnd-kit
function KanbanCard({
  opportunity,
  stage,
  onClick,
  isDragOverlay = false,
}: {
  opportunity: Opportunity
  stage: OpportunityStage
  onClick: () => void
  isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity, stage },
  })
  const config = STAGE_CONFIG[stage]

  // Apply dnd-kit transform directly — no framer-motion layout (they conflict)
  const style: React.CSSProperties = transform && !isDragOverlay
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999, position: 'relative' }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        'group relative bg-white rounded-xl border shadow-sm select-none',
        'transition-shadow duration-150',
        config.cardBorder,
        isDragging ? 'opacity-30 shadow-none' : `hover:shadow-md ${config.cardHover}`,
        isDragOverlay ? 'rotate-2 shadow-2xl scale-105 cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
    >
      <div className="p-3.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-slate-700 line-clamp-2 flex-1">
            {opportunity.title}
          </p>
          {/* Open button — stops drag propagation so it's a click not a drag */}
          <button
            className="flex-shrink-0 w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-slate-400 hover:text-slate-600"
            onPointerDown={e => e.stopPropagation()}
            onClick={onClick}
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-2.5 truncate">{opportunity.prospect_name}</p>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {opportunity.estimated_amount && (
            <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
              <Euro className="w-2.5 h-2.5" />
              {formatCurrency(opportunity.estimated_amount)}
            </span>
          )}
          {opportunity.city && (
            <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              <MapPin className="w-2.5 h-2.5" />
              {opportunity.city}
            </span>
          )}
        </div>

        {/* Footer */}
        {(opportunity.next_action_date || opportunity.converted_to_client) && (
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
            {opportunity.next_action_date && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <Calendar className="w-3 h-3" />
                {formatDate(opportunity.next_action_date)}
              </span>
            )}
            {opportunity.converted_to_client && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium ml-auto">
                <CheckCircle2 className="w-3 h-3" />
                Converti
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  useEffect(() => { document.title = 'Pipeline — Proprely' }, [])

  const { opportunities, addOpportunity, updateOpportunity, deleteOpportunity, winOpportunity, moveOpportunity, quotes } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [formStage, setFormStage] = useState<OpportunityStage>('ouvert')
  const [form, setForm] = useState(defaultForm)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<OpportunityStage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over && STAGES.includes(event.over.id as OpportunityStage)) {
      setOverId(event.over.id as OpportunityStage)
    } else {
      setOverId(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over) return

    const opportunityId = active.id as string
    const targetStage = over.id as OpportunityStage

    if (!STAGES.includes(targetStage)) return

    const opp = opportunities.find(o => o.id === opportunityId)
    if (!opp || opp.stage === targetStage) return

    if (targetStage === 'gagne') {
      winOpportunity(opportunityId)
      toast.success(`🎉 Opportunité gagnée ! Client et site créés automatiquement.`, { duration: 5000 })
    } else {
      moveOpportunity(opportunityId, targetStage)
      toast.success(`Déplacé en ${OPPORTUNITY_STAGE_LABELS[targetStage]}`)
    }
  }

  const handleOpenCreate = (stage: OpportunityStage = 'ouvert') => {
    setFormStage(stage)
    setForm({ ...defaultForm, stage })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title || !form.prospect_name) {
      toast.error('Titre et nom du prospect requis')
      return
    }
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`, company_id: 'company-1',
      lead_id: null, client_id: null, site_id: null,
      ...form,
      estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
      next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
      status: 'ouvert', converted_to_client: false, converted_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    addOpportunity(newOpp)
    toast.success('Opportunité créée')
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    deleteOpportunity(id)
    setSelectedOpp(null)
    setConfirmDelete(null)
    toast.success('Opportunité supprimée')
  }

  const handleWin = (id: string) => {
    winOpportunity(id)
    toast.success(`🎉 Opportunité gagnée ! Client créé automatiquement.`, { duration: 5000 })
    setSelectedOpp(null)
  }

  const oppsByStage = (stage: OpportunityStage) => opportunities.filter(o => o.stage === stage)
  const activeOpp = activeId ? opportunities.find(o => o.id === activeId) : null

  const totalOpportunities = opportunities.length
  const totalPipeline = opportunities.reduce((s, o) => s + (o.estimated_amount || 0), 0)
  const wonCount = oppsByStage('gagne').length

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pipeline commercial</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {totalOpportunities} opportunités · {formatCurrency(totalPipeline)} pipeline · {wonCount} gagnées
              </p>
            </div>
            <Button
              onClick={() => handleOpenCreate()}
              className="gap-2 bg-slate-900 hover:bg-slate-700 text-white shadow-sm h-9"
              size="sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle opportunité
            </Button>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full overflow-x-auto">
              <div className="flex gap-4 p-6 h-full min-w-max">
                {STAGES.map(stage => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    opportunities={oppsByStage(stage)}
                    onCardClick={(opp) => setSelectedOpp(opp)}
                    onAddCard={handleOpenCreate}
                    isDraggingOver={overId === stage}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeOpp ? (
                <KanbanCard
                  opportunity={activeOpp}
                  stage={activeOpp.stage}
                  onClick={() => {}}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Card detail panel */}
      {selectedOpp && (
        <CardDetailPanel
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onDelete={(id) => {
            setConfirmDelete(id)
            setSelectedOpp(null)
          }}
          onWin={handleWin}
        />
      )}

      {/* Create form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle opportunité</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-600 mb-1.5 block">Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Nettoyage bureaux - Société X" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-600 mb-1.5 block">Nom du prospect *</Label>
                <Input value={form.prospect_name} onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Contact</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Téléphone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Ville</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Montant estimé (€)</Label>
                <Input type="number" value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Étape</Label>
                <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v as OpportunityStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Prochaine action</Label>
                <Input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Type client</Label>
                <Select value={form.client_type} onValueChange={(v) => setForm(f => ({ ...f, client_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                    <SelectItem value="professionnel">Professionnel libéral</SelectItem>
                    <SelectItem value="syndic">Syndic</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-600 mb-1.5 block">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Supprimer l'opportunité"
        description="Cette action est irréversible. L'opportunité sera définitivement supprimée."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </AdminLayout>
  )
}
