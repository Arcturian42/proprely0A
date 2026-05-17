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
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ProspectingFlow } from './_components/ProspectingFlow'
import { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, NEXT_ACTION_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, MapPin, Calendar, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { CardDetailPanel } from '@/components/commercial/CardDetailPanel'
import { NewOpportunityFlow } from './_components/NewOpportunityFlow'

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: OpportunityStage[] = [
  'ouvert',
  'decouverte',
  'proposition',
  'negociation',
  'gagne',
  'perdu',
]

const STAGE_CONFIG: Record<
  OpportunityStage,
  {
    dot: string
    headerText: string
    borderAccent: string
    serviceBadge: string
    emptyBg: string
    gradient: string
  }
> = {
  ouvert: {
    dot: 'bg-slate-400',
    headerText: 'text-slate-700',
    borderAccent: 'border-l-slate-400',
    serviceBadge: 'bg-slate-100 text-slate-600',
    emptyBg: 'bg-slate-50/50',
    gradient: 'from-slate-500/10 to-slate-400/5',
  },
  decouverte: {
    dot: 'bg-blue-400',
    headerText: 'text-blue-700',
    borderAccent: 'border-l-blue-400',
    serviceBadge: 'bg-blue-50 text-blue-600',
    emptyBg: 'bg-blue-50/30',
    gradient: 'from-blue-500/10 to-blue-400/5',
  },
  proposition: {
    dot: 'bg-violet-500',
    headerText: 'text-violet-700',
    borderAccent: 'border-l-violet-500',
    serviceBadge: 'bg-violet-50 text-violet-600',
    emptyBg: 'bg-violet-50/30',
    gradient: 'from-violet-500/10 to-violet-400/5',
  },
  negociation: {
    dot: 'bg-amber-400',
    headerText: 'text-amber-700',
    borderAccent: 'border-l-amber-400',
    serviceBadge: 'bg-amber-50 text-amber-600',
    emptyBg: 'bg-amber-50/30',
    gradient: 'from-amber-500/10 to-amber-400/5',
  },
  gagne: {
    dot: 'bg-emerald-500',
    headerText: 'text-emerald-700',
    borderAccent: 'border-l-emerald-500',
    serviceBadge: 'bg-emerald-50 text-emerald-600',
    emptyBg: 'bg-emerald-50/30',
    gradient: 'from-green-500/10 to-emerald-400/5',
  },
  perdu: {
    dot: 'bg-red-400',
    headerText: 'text-red-600',
    borderAccent: 'border-l-red-400',
    serviceBadge: 'bg-red-50 text-red-500',
    emptyBg: 'bg-red-50/20',
    gradient: 'from-red-500/10 to-red-400/5',
  },
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

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

  const style: React.CSSProperties =
    transform && !isDragOverlay
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: 999,
          position: 'relative',
        }
      : {}

  // Urgency: overdue next_action_date
  const isOverdue = opportunity.next_action_date
    ? new Date(opportunity.next_action_date) < new Date()
    : false

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={[
        // Base glassmorphism
        'group relative bg-white/90 backdrop-blur-sm',
        'rounded-xl border border-white/60 shadow-sm select-none',
        // Left border accent (4px colored strip)
        'border-l-4',
        config.borderAccent,
        // Hover lift animation
        'hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200',
        // Dragging / overlay states
        isDragging ? 'opacity-40 scale-95 shadow-none' : '',
        isDragOverlay
          ? 'rotate-1 shadow-2xl ring-2 ring-blue-400/50 cursor-grabbing'
          : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="p-3.5">
        {/* Row 1: company name + amount badge */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 flex-1">
            {opportunity.prospect_name || opportunity.title}
          </p>
          {opportunity.estimated_amount ? (
            <span className="flex-shrink-0 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
              {formatCurrency(opportunity.estimated_amount)}
            </span>
          ) : null}
        </div>

        {/* Row 2: contact name */}
        {opportunity.contact_name && (
          <p className="text-xs text-slate-500 mb-2.5 truncate">
            {opportunity.contact_name}
          </p>
        )}

        {/* Row 3: service pill + city pill */}
        {(opportunity.service_type || opportunity.city) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {opportunity.service_type && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.serviceBadge}`}
              >
                {opportunity.service_type}
              </span>
            )}
            {opportunity.city && (
              <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" />
                {opportunity.city}
              </span>
            )}
          </div>
        )}

        {/* Next action block */}
        {(opportunity.next_action_date || opportunity.next_action_type) && (
          <div className="pt-2 border-t border-slate-100/80 space-y-0.5">
            <div
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                isOverdue ? 'text-red-500' : 'text-amber-700'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {opportunity.next_action_type
                ? NEXT_ACTION_TYPE_LABELS[opportunity.next_action_type] || opportunity.next_action_type
                : 'Action'}
              {opportunity.next_action_date && (
                <span className="font-normal text-slate-500 ml-1">
                  · {formatDate(opportunity.next_action_date)}
                </span>
              )}
              {isOverdue && (
                <span className="ml-1 inline-flex items-center gap-0.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Urgent
                </span>
              )}
            </div>
            {opportunity.next_action_note && (
              <p className="text-xs text-slate-500 line-clamp-2">
                &laquo;&nbsp;{opportunity.next_action_note}&nbsp;&raquo;
              </p>
            )}
          </div>
        )}

        {/* Footer badges */}
        {(opportunity.siret || opportunity.source === 'manual' || opportunity.converted_to_client) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            {opportunity.siret && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" /> SIRET
              </span>
            )}
            {opportunity.source === 'manual' && !opportunity.siret && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Saisie manuelle
              </span>
            )}
            {opportunity.converted_to_client && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium ml-auto">
                <CheckCircle2 className="w-2.5 h-2.5" /> Converti
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

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
      {/* Glassmorphism column header */}
      <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
          <span className={`text-xs font-semibold ${config.headerText}`}>
            {OPPORTUNITY_STAGE_LABELS[stage]}
          </span>
          <span className="text-xs text-slate-400 bg-white/60 px-1.5 py-0.5 rounded-full">
            {opportunities.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {total > 0 && (
            <span className="text-xs font-medium text-slate-500">
              {formatCurrency(total)}
            </span>
          )}
          <button
            onClick={() => onAddCard(stage)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all"
            aria-label={`Ajouter une opportunité en ${OPPORTUNITY_STAGE_LABELS[stage]}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 min-h-[120px] space-y-2.5 rounded-xl p-2 transition-all duration-200',
          isDraggingOver
            ? `bg-gradient-to-b ${config.gradient} border-2 border-dashed border-current opacity-80`
            : 'bg-transparent',
        ].join(' ')}
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
          <div
            className={`${config.emptyBg} rounded-xl p-5 text-center border-2 border-dashed border-slate-200/70`}
          >
            <p className="text-xs text-slate-400">Aucune opportunité</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  useEffect(() => {
    document.title = 'Pipeline — Proprely'
  }, [])

  const { opportunities, deleteOpportunity, winOpportunity, moveOpportunity } =
    useAppStore()

  const [showForm, setShowForm] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<OpportunityStage | null>(null)

  // Delay-based activation: quick tap (< 200ms) → onClick fires normally.
  // Hold (≥ 200ms) → drag starts. No conflict between click and drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  // ── Drag handlers ─────────────────────────────────────────────────────────

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

    const opp = opportunities.find((o) => o.id === opportunityId)
    if (!opp || opp.stage === targetStage) return

    if (targetStage === 'gagne') {
      winOpportunity(opportunityId)
      toast.success('🎉 Opportunité gagnée ! Client et site créés automatiquement.', {
        duration: 5000,
      })
    } else {
      moveOpportunity(opportunityId, targetStage)
      toast.success(`Déplacé en ${OPPORTUNITY_STAGE_LABELS[targetStage]}`)
    }
  }

  // ── Create / delete ────────────────────────────────────────────────────────

  const handleOpenCreate = () => setShowForm(true)

  const handleDelete = (id: string) => {
    deleteOpportunity(id)
    setSelectedOpp(null)
    setConfirmDelete(null)
    toast.success('Opportunité supprimée')
  }

  const handleWin = (id: string) => {
    winOpportunity(id)
    toast.success('🎉 Opportunité gagnée ! Client créé automatiquement.', { duration: 5000 })
    setSelectedOpp(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const oppsByStage = (stage: OpportunityStage) =>
    opportunities.filter((o) => o.stage === stage)

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null

  const totalPipeline = opportunities.reduce((s, o) => s + (o.estimated_amount || 0), 0)
  const wonCount = oppsByStage('gagne').length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pipeline commercial</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {opportunities.length} opportunités · {formatCurrency(totalPipeline)} pipeline ·{' '}
                {wonCount} gagnées
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ProspectingFlow />
              <Button
                onClick={() => handleOpenCreate()}
                className="gap-2 bg-slate-900 hover:bg-slate-700 text-white shadow-sm h-9"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Nouvelle opportunité
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full overflow-x-auto">
              <div className="flex gap-4 p-6 h-full min-w-max">
                {STAGES.map((stage) => (
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

      {/* Card detail panel — opens on card click */}
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

      {/* New opportunity 3-step wizard */}
      <NewOpportunityFlow open={showForm} onOpenChange={setShowForm} />

      {/* Delete confirmation */}
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
