import {
  LEAD_STATUS_LABELS,
  MISSION_STATUS_LABELS,
  AGENT_STATUS_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  TIME_ENTRY_STATUS_LABELS,
  OPERATIONAL_ITEM_STATUS_LABELS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

const STATUS_STYLE_MAP: Record<string, string> = {
  // Green — active/done
  en_cours: 'bg-emerald-50 text-emerald-700',
  actif: 'bg-emerald-50 text-emerald-700',
  disponible: 'bg-emerald-50 text-emerald-700',
  terminee: 'bg-emerald-50 text-emerald-700',
  termine: 'bg-emerald-50 text-emerald-700',
  qualifie: 'bg-emerald-50 text-emerald-700',
  validee: 'bg-emerald-50 text-emerald-700',
  // Purple — converted/won
  converti: 'bg-violet-50 text-violet-700',
  gagnee: 'bg-violet-50 text-violet-700',
  // Blue — planned/scheduled
  prevue: 'bg-blue-50 text-blue-700',
  planifie: 'bg-blue-50 text-blue-700',
  prise_de_contact: 'bg-blue-50 text-blue-700',
  decouverte: 'bg-blue-50 text-blue-700',
  nouveau: 'bg-blue-50 text-blue-700',
  a_contacter: 'bg-blue-50 text-blue-700',
  // Red — issues/cancelled
  probleme_signale: 'bg-red-50 text-red-700',
  annulee: 'bg-red-50 text-red-700',
  annule: 'bg-red-50 text-red-700',
  rejete: 'bg-red-50 text-red-700',
  absent: 'bg-red-50 text-red-700',
  perdue: 'bg-red-50 text-red-700',
  // Amber — pending validation
  a_valider: 'bg-amber-50 text-amber-700',
  en_conge: 'bg-amber-50 text-amber-700',
  occupe: 'bg-amber-50 text-amber-700',
  proposition: 'bg-amber-50 text-amber-700',
  negociation: 'bg-amber-50 text-amber-700',
  corrigee: 'bg-amber-50 text-amber-700',
  // Gray — misc
  a_organiser: 'bg-gray-100 text-gray-600',
  inactif: 'bg-gray-100 text-gray-600',
  lead: 'bg-gray-100 text-gray-600',
  contacte: 'bg-gray-100 text-gray-600',
}

const ALL_LABELS: Record<string, string> = {
  ...LEAD_STATUS_LABELS,
  ...OPPORTUNITY_STAGE_LABELS,
  ...MISSION_STATUS_LABELS,
  ...AGENT_STATUS_LABELS,
  ...TIME_ENTRY_STATUS_LABELS,
  ...OPERATIONAL_ITEM_STATUS_LABELS,
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE_MAP[status] || 'bg-gray-100 text-gray-600'
  const label = ALL_LABELS[status] || status

  return (
    <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap', style)}>
      {label}
    </span>
  )
}
