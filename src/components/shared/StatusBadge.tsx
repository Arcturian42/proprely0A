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
  // Pale green — active/done
  en_cours: 'bg-[#EDF3EC] text-[#346538]',
  actif: 'bg-[#EDF3EC] text-[#346538]',
  disponible: 'bg-[#EDF3EC] text-[#346538]',
  terminee: 'bg-[#EDF3EC] text-[#346538]',
  termine: 'bg-[#EDF3EC] text-[#346538]',
  qualifie: 'bg-[#EDF3EC] text-[#346538]',
  converti: 'bg-[#EDF3EC] text-[#346538]',
  gagnee: 'bg-[#EDF3EC] text-[#346538]',
  gagne: 'bg-[#EDF3EC] text-[#346538]',
  validee: 'bg-[#EDF3EC] text-[#346538]',
  // Pale blue — planned/scheduled
  prevue: 'bg-[#E1F3FE] text-[#1F6C9F]',
  planifie: 'bg-[#E1F3FE] text-[#1F6C9F]',
  prise_de_contact: 'bg-[#E1F3FE] text-[#1F6C9F]',
  decouverte: 'bg-[#E1F3FE] text-[#1F6C9F]',
  nouveau: 'bg-[#E1F3FE] text-[#1F6C9F]',
  a_contacter: 'bg-[#E1F3FE] text-[#1F6C9F]',
  // Pale red — issues/cancelled
  probleme_signale: 'bg-[#FDEBEC] text-[#9F2F2D]',
  annulee: 'bg-[#FDEBEC] text-[#9F2F2D]',
  annule: 'bg-[#FDEBEC] text-[#9F2F2D]',
  rejete: 'bg-[#FDEBEC] text-[#9F2F2D]',
  absent: 'bg-[#FDEBEC] text-[#9F2F2D]',
  perdue: 'bg-[#FDEBEC] text-[#9F2F2D]',
  perdu: 'bg-[#FDEBEC] text-[#9F2F2D]',
  ouvert: 'bg-[#f7f6f3] text-[#787774]',
  // Pale yellow — pending validation
  a_valider: 'bg-[#FBF3DB] text-[#956400]',
  en_conge: 'bg-[#FBF3DB] text-[#956400]',
  occupe: 'bg-[#FBF3DB] text-[#956400]',
  proposition: 'bg-[#FBF3DB] text-[#956400]',
  negociation: 'bg-[#FBF3DB] text-[#956400]',
  corrigee: 'bg-[#FBF3DB] text-[#956400]',
  // Neutral — a_organiser / misc
  a_organiser: 'bg-[#f7f6f3] text-[#787774]',
  inactif: 'bg-[#f7f6f3] text-[#787774]',
  lead: 'bg-[#f7f6f3] text-[#787774]',
  contacte: 'bg-[#f7f6f3] text-[#787774]',
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
  const style = STATUS_STYLE_MAP[status] || 'bg-[#f7f6f3] text-[#787774]'
  const label = ALL_LABELS[status] || status

  return (
    <span className={cn('rounded-full text-[11px] font-medium px-2 py-0.5 tracking-[0.02em] inline-flex items-center', style)}>
      {label}
    </span>
  )
}
