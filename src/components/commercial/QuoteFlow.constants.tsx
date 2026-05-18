import {
  Building2,
  Brush,
  Cog,
  Glasses,
  Grid2x2,
  HelpCircle,
  Leaf,
} from 'lucide-react'
import type { ServiceCategory } from '@/types'
import type { Complexity, FlowStep } from './QuoteFlow.types'

// Extracted from QuoteFlow.tsx — pure constants + JSX literals shared by
// the wizard steps. .tsx extension is required because SERVICE_ICONS
// holds JSX (lucide icon instances).

export const STEP_TITLES: Record<FlowStep, string> = {
  0: 'Devis',
  1: 'Services',
  2: 'Notes de visite',
  3: 'Médias',
  4: 'Calcul IA',
  5: 'Aperçu & envoi',
}

export const SERVICE_ICONS: Record<ServiceCategory, React.ReactNode> = {
  bureaux_recurrent: <Building2 className="w-4 h-4" />,
  vitres: <Glasses className="w-4 h-4" />,
  terrasse: <Leaf className="w-4 h-4" />,
  sols_mecanises: <Cog className="w-4 h-4" />,
  fin_chantier: <Brush className="w-4 h-4" />,
  moquette: <Grid2x2 className="w-4 h-4" />,
  autre: <HelpCircle className="w-4 h-4" />,
}

export const SERVICE_PILL_ORDER: ServiceCategory[] = [
  'bureaux_recurrent',
  'vitres',
  'terrasse',
  'sols_mecanises',
  'fin_chantier',
  'moquette',
  'autre',
]

export const FREQUENCY_OPTIONS = [
  'Ponctuel',
  'Quotidien',
  'Hebdomadaire',
  'Bimensuel',
  'Mensuel',
  'Trimestriel',
]

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  élevé: 'Élevé',
}

export function slideVariants(direction: 'left' | 'right') {
  return {
    initial: { opacity: 0, x: direction === 'right' ? 40 : -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === 'right' ? -40 : 40 },
  }
}
