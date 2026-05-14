import { Badge } from '@/components/ui/badge'
import {
  LEAD_STATUS_LABELS,
  MISSION_STATUS_LABELS,
  AGENT_STATUS_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  TIME_ENTRY_STATUS_LABELS,
  OPERATIONAL_ITEM_STATUS_LABELS,
} from '@/lib/constants'

type StatusType = 'lead' | 'opportunity' | 'mission' | 'agent' | 'timeEntry' | 'operationalItem'

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple'> = {
  // Lead statuses
  nouveau: 'info',
  qualifie: 'success',
  a_contacter: 'warning',
  contacte: 'purple',
  converti: 'success',
  rejete: 'destructive',
  // Opportunity stages
  lead: 'secondary',
  prise_de_contact: 'info',
  decouverte: 'info',
  proposition: 'warning',
  negociation: 'purple',
  gagnee: 'success',
  perdue: 'destructive',
  // Mission statuses
  prevue: 'secondary',
  en_cours: 'info',
  terminee: 'success',
  a_valider: 'warning',
  probleme_signale: 'destructive',
  annulee: 'outline',
  // Agent statuses
  disponible: 'success',
  occupe: 'warning',
  absent: 'destructive',
  inactif: 'secondary',
  // Time entry statuses
  validee: 'success',
  corrigee: 'warning',
  // Operational item statuses
  a_organiser: 'warning',
  planifie: 'info',
  annule: 'outline',
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
  const variant = STATUS_VARIANT_MAP[status] || 'secondary'
  const label = ALL_LABELS[status] || status

  return <Badge variant={variant}>{label}</Badge>
}
