'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { PipelineLead, PipelineStatus } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { PIPELINE_STATUS_LABELS, PIPELINE_STATUS_COLORS } from '@/lib/pipeline-actions'
import { LeadCard } from './LeadCard'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const COLUMNS: PipelineStatus[] = [
  'nouveau', 'a_qualifier', 'devis_a_preparer', 'devis_envoye', 'en_discussion', 'gagne', 'perdu', 'archive'
]

interface KanbanBoardProps {
  leads: PipelineLead[]
  onSelectLead: (lead: PipelineLead) => void
}

export function KanbanBoard({ leads, onSelectLead }: KanbanBoardProps) {
  const { moveLead } = usePipelineStore()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const getColumnLeads = useCallback((status: PipelineStatus) =>
    leads
      .filter(l => l.status === status)
      .sort((a, b) => {
        const pOrder = { chaud: 0, tiede: 1, froid: 2 }
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority]
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      }),
    [leads]
  )

  const handleDragStart = (result: { draggableId: string }) => {
    setDraggingId(result.draggableId)
  }

  const handleDragEnd = (result: DropResult) => {
    setDraggingId(null)
    if (!result.destination) return
    const fromStatus = result.source.droppableId as PipelineStatus
    const toStatus = result.destination.droppableId as PipelineStatus
    if (fromStatus === toStatus) return

    moveLead(result.draggableId, toStatus)
    toast.success(`Lead déplacé vers "${PIPELINE_STATUS_LABELS[toStatus]}"`)
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-6 min-h-0 h-full">
        {COLUMNS.map(status => {
          const colLeads = getColumnLeads(status)
          const colors = PIPELINE_STATUS_COLORS[status]
          const totalValue = colLeads.reduce((s, l) => s + (l.value_monthly ?? 0), 0)

          return (
            <div key={status} className="flex-shrink-0 w-64 flex flex-col">
              {/* Column header */}
              <div className={cn('rounded-xl border px-3 py-2.5 mb-2', colors.bg, colors.border)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                    <span className={cn('text-xs font-semibold', colors.text)}>{PIPELINE_STATUS_LABELS[status]}</span>
                  </div>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', colors.text, colors.bg)}>
                    {colLeads.length}
                  </span>
                </div>
                {totalValue > 0 && (
                  <p className={cn('text-xs mt-0.5 font-medium', colors.text)}>{formatCurrency(totalValue)}/m</p>
                )}
              </div>

              {/* Droppable column */}
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 rounded-xl transition-colors min-h-[120px] space-y-2 p-2',
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-slate-50/50'
                    )}
                  >
                    {colLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                          >
                            <LeadCard
                              lead={lead}
                              onClick={() => onSelectLead(lead)}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colLeads.length === 0 && !snapshot.isDraggingOver && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                        <p className="text-xs text-slate-300">Glissez ici</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
