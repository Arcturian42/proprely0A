import type {
  CalculationUnit,
  ConsumablesPolicy,
  EquipmentMode,
  RecurrenceMode,
  TravelPolicy,
} from '@/types'

export interface DefaultServiceTemplate {
  key: string
  name: string
  description: string
  suggested_unit: CalculationUnit
  sort_order: number
}

export const DEFAULT_SERVICES: readonly DefaultServiceTemplate[] = [
  {
    key: 'office_cleaning',
    name: 'Nettoyage de bureaux',
    description: 'Entretien récurrent de locaux tertiaires (open space, salles de réunion, sanitaires).',
    suggested_unit: 'm2',
    sort_order: 10,
  },
  {
    key: 'end_of_construction',
    name: 'Nettoyage de fin de chantier',
    description: 'Remise en propreté après travaux : poussière, gravats légers, vitrage.',
    suggested_unit: 'm2',
    sort_order: 20,
  },
  {
    key: 'windows',
    name: 'Nettoyage de vitres',
    description: 'Vitrages intérieurs et extérieurs, avec ou sans accès difficile.',
    suggested_unit: 'm2',
    sort_order: 30,
  },
  {
    key: 'carpet',
    name: 'Nettoyage de moquette',
    description: 'Injection-extraction, shampouinage, traitement des taches.',
    suggested_unit: 'm2',
    sort_order: 40,
  },
  {
    key: 'mechanized_floor',
    name: 'Remise en état des sols mécanisée',
    description: 'Décapage, métallisation, lustrage sur sols durs.',
    suggested_unit: 'm2',
    sort_order: 50,
  },
  {
    key: 'terrace',
    name: 'Nettoyage de terrasse',
    description: 'Démoussage, nettoyage haute pression, dégraissage.',
    suggested_unit: 'm2',
    sort_order: 60,
  },
  {
    key: 'parking',
    name: 'Nettoyage de parking',
    description: 'Balayage mécanisé, dégraissage, marquages au sol.',
    suggested_unit: 'm2',
    sort_order: 70,
  },
  {
    key: 'condominium',
    name: 'Nettoyage de copropriété',
    description: 'Entretien des parties communes : halls, escaliers, ascenseurs, locaux poubelles.',
    suggested_unit: 'flat_rate',
    sort_order: 80,
  },
  {
    key: 'disinfection',
    name: 'Désinfection',
    description: 'Protocoles bactéricide / virucide, traitement spécifique post-incident.',
    suggested_unit: 'm2',
    sort_order: 90,
  },
  {
    key: 'one_shot',
    name: 'Intervention ponctuelle',
    description: 'Mission unique sur demande client, hors contrat récurrent.',
    suggested_unit: 'hour',
    sort_order: 100,
  },
  {
    key: 'recurring',
    name: 'Entretien régulier',
    description: 'Contrat de prestations récurrentes (hebdomadaire, mensuel, etc.).',
    suggested_unit: 'weekly_passes',
    sort_order: 110,
  },
] as const

export const CALCULATION_UNIT_LABELS_FR: Record<CalculationUnit, string> = {
  m2: 'Au m²',
  linear_meter: 'Au mètre linéaire',
  hour: "À l'heure",
  flat_rate: 'Au forfait / à la mission',
  room_count: 'Au nombre de pièces',
  floor_count: "Au nombre d'étages",
  workstation_count: 'Au nombre de postes de travail',
  weekly_passes: 'Au nombre de passages par semaine',
  other: 'Autre',
}

export const RECURRENCE_MODE_LABELS_FR: Record<RecurrenceMode, string> = {
  per_pass: 'Au passage',
  weekly: 'À la semaine',
  monthly: 'Au mois',
  annual_contract: 'Au contrat annuel',
  one_shot: 'Ponctuel',
}

export const EQUIPMENT_MODE_LABELS_FR: Record<EquipmentMode, string> = {
  included: 'Inclus dans le prix',
  separate_line: 'Ajouté en ligne séparée',
  per_quote_decision: 'À choisir à chaque devis',
}

export const CONSUMABLES_POLICY_LABELS_FR: Record<ConsumablesPolicy, string> = {
  always_include: 'Toujours inclure',
  never_include: 'Ne jamais inclure',
  per_quote_decision: 'À choisir à chaque devis',
}

export const TRAVEL_POLICY_LABELS_FR: Record<TravelPolicy, string> = {
  always_include: 'Toujours inclure',
  never_include: 'Ne jamais inclure',
  per_quote_decision: 'À choisir à chaque devis',
}

export const INVITE_ROLE_LABELS_FR: Record<'admin' | 'sales' | 'agent', string> = {
  admin:
    "Peut gérer l'entreprise, les clients, les sites, les missions, le planning, les agents et les paramètres.",
  sales:
    'Peut gérer les prospects, le pipeline commercial, les devis et le suivi des opportunités.',
  agent:
    'Peut consulter ses missions, son planning et les informations opérationnelles qui le concernent.',
}
