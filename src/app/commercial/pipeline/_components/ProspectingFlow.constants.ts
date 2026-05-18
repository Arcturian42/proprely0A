// Wizard filter options extracted from ProspectingFlow.tsx — pure constants
// shared by the wizard step UI and any future search analytics that need
// to label filter values.

export interface Filters {
  category: string
  size: string
  surface: string
  locationType: 'postcode' | 'departement' | 'city'
  locationValue: string
  quality: string
}

export const DEFAULT_FILTERS: Filters = {
  category: 'bureaux',
  size: '10-50',
  surface: '100-500',
  locationType: 'postcode',
  locationValue: '',
  quality: 'recurring',
}

export const CATEGORIES: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'bureaux', label: 'Bureaux', emoji: '🏢' },
  { value: 'copropriete', label: 'Copropriété', emoji: '🏠' },
  { value: 'hotel', label: 'Hôtel', emoji: '🛎️' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'industrie', label: 'Industrie', emoji: '🏭' },
  { value: 'commerce', label: 'Commerce', emoji: '🛍️' },
  { value: 'fin_de_chantier', label: 'Fin de chantier', emoji: '🚧' },
  { value: 'medical', label: 'Médical', emoji: '⚕️' },
  { value: 'retail', label: 'Retail', emoji: '🛒' },
  { value: 'coworking', label: 'Coworking', emoji: '💼' },
]

export const SIZES = [
  { value: '1-10', label: '1-10 employés' },
  { value: '10-50', label: '10-50' },
  { value: '50-100', label: '50-100' },
  { value: '100+', label: '100+' },
]

export const SURFACES = [
  { value: '<100', label: '< 100 m²' },
  { value: '100-500', label: '100-500 m²' },
  { value: '500-1000', label: '500-1000 m²' },
  { value: '1000+', label: '1000+ m²' },
]

export const QUALITIES = [
  { value: 'recurring', label: 'Potentiel récurrent', desc: 'Contrats hebdomadaires' },
  { value: 'newly_created', label: 'Société récente', desc: 'Créée < 2 ans' },
  { value: 'growing', label: 'En croissance', desc: 'Effectif en hausse' },
  { value: 'high_end', label: 'Haut de gamme', desc: 'Hôtellerie, médical' },
  { value: 'no_website', label: 'Sans site web', desc: 'Acquisition facile' },
  { value: 'low_rating', label: 'Note Google faible', desc: 'Opportunité d\'image' },
]

export type Phase = 'wizard' | 'searching' | 'deck' | 'done'
