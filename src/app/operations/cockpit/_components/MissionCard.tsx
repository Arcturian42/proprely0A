'use client'

import { Mission } from '@/types'
import { cn, getOperationalStatus, initials, formatHours } from '@/lib/utils'
import { OPERATIONAL_MISSION_STATUS_COLORS } from '@/lib/constants'
import { Building2, MapPin, Phone, Clock, Users, AlertTriangle, Euro, Repeat } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  mission: Mission
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  isDragging?: boolean
}

export function MissionCard({ mission, onClick, onDragStart, isDragging }: Props) {
  const status = getOperationalStatus(mission)
  const colors = OPERATIONAL_MISSION_STATUS_COLORS[status]!
  const urgent = mission.urgency === 'urgente' || mission.priority === 'urgente'

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-xl bg-white border border-slate-200 border-l-4 p-3 shadow-sm hover:shadow-md transition-all',
        colors.border,
        isDragging && 'opacity-50 scale-95',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="font-semibold text-sm text-slate-900 truncate">{mission.client?.name ?? '—'}</p>
          </div>
          <p className="text-xs text-slate-500 truncate">{mission.site?.name}</p>
          {mission.site?.address && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" /> {mission.site.address}
            </p>
          )}
        </div>
        {urgent && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
            <AlertTriangle className="w-2.5 h-2.5" /> Urgent
          </span>
        )}
      </div>

      {mission.service_type && (
        <p className="text-[11px] text-slate-600 mb-2 italic truncate">
          {mission.service_type}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 mb-2">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {formatHours(mission.planned_hours)}
          {mission.start_time && ` · ${mission.start_time.slice(0, 5)}`}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-slate-400" />
          {mission.estimated_workers ?? 1} agent{(mission.estimated_workers ?? 1) > 1 ? 's' : ''}
        </div>
        {mission.estimated_profitability != null && (
          <div className="flex items-center gap-1">
            <Euro className="w-3 h-3 text-slate-400" />
            {Math.round(mission.estimated_profitability)} €
          </div>
        )}
        {mission.recurrence && mission.recurrence !== 'ponctuelle' && (
          <div className="flex items-center gap-1 text-violet-600">
            <Repeat className="w-3 h-3" />
            {mission.recurrence}
          </div>
        )}
      </div>

      {mission.scheduled_date && status !== 'a_organiser' && (
        <p className="text-[11px] text-slate-500 mb-2">
          {format(parseISO(mission.scheduled_date), 'EEE d MMM', { locale: fr })}
        </p>
      )}

      {mission.contact_phone && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-2 truncate">
          <Phone className="w-2.5 h-2.5" /> {mission.contact_phone}
        </p>
      )}

      {/* Agents assignés */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex -space-x-1.5">
          {(mission.agents ?? []).slice(0, 3).map(a => (
            <div
              key={a.id}
              title={`${a.first_name} ${a.last_name}`}
              className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            >
              {initials(a.first_name, a.last_name)}
            </div>
          ))}
          {(mission.agents?.length ?? 0) > 3 && (
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              +{mission.agents!.length - 3}
            </div>
          )}
          {(mission.agents?.length ?? 0) === 0 && (
            <span className="text-[10px] text-slate-400 italic">Aucun agent</span>
          )}
        </div>
        {mission.organization_step != null && status === 'a_organiser' && (
          <span className="text-[10px] text-slate-400">
            Étape {mission.organization_step}/4
          </span>
        )}
      </div>
    </div>
  )
}
