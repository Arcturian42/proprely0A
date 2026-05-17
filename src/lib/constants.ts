export const LEAD_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  qualifie: 'Qualifié',
  a_contacter: 'À contacter',
  contacte: 'Contacté',
  converti: 'Converti',
  rejete: 'Rejeté',
}

export const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  decouverte: 'Découverte',
  proposition: 'Proposition',
  negociation: 'Négociation',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

export const MISSION_STATUS_LABELS: Record<string, string> = {
  prevue: 'Prévue',
  en_cours: 'En cours',
  terminee: 'Terminée',
  a_valider: 'À valider',
  probleme_signale: 'Problème signalé',
  annulee: 'Annulée',
}

export const AGENT_STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  absent: 'Absent',
  inactif: 'Inactif',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  auto_entrepreneur: 'Auto-entrepreneur',
  cdd: 'CDD',
  cdi: 'CDI',
  extra: 'Extra',
  sous_traitant: 'Sous-traitant',
}

export const TIME_ENTRY_STATUS_LABELS: Record<string, string> = {
  prevue: 'Prévue',
  a_valider: 'À valider',
  validee: 'Validée',
  corrigee: 'Corrigée',
}

export const OPERATIONAL_ITEM_STATUS_LABELS: Record<string, string> = {
  a_organiser: 'À organiser',
  en_cours: 'En cours',
  planifie: 'Planifié',
  annule: 'Annulé',
}

export const NEXT_ACTION_TYPE_LABELS: Record<string, string> = {
  call: 'Appel',
  email: 'Email',
  site_visit: 'Visite site',
  proposal: 'Envoyer proposition',
  follow_up: 'Relance',
  meeting: 'Rendez-vous',
  qualification: 'Qualification',
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  signe: 'Signé',
  refuse: 'Refusé',
  expire: 'Expiré',
}

export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  fin_chantier: 'Fin de chantier',
  terrasse: 'Nettoyage terrasse',
  sols_mecanises: 'Remise en état sols mécanisés',
  moquette: 'Nettoyage moquette',
  bureaux_recurrent: 'Nettoyage bureaux récurrent',
  vitres: 'Nettoyage vitres',
  autre: 'Autre prestation',
}

export const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const DAYS_KEYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Statuts opérationnels (nouveau pipeline cockpit)
export const OPERATIONAL_MISSION_STATUS_ORDER = [
  'a_organiser',
  'en_preparation',
  'en_attente_validation_client',
  'planifie',
  'en_cours',
  'terminee',
  'incident',
] as const

export const OPERATIONAL_MISSION_STATUS_LABELS: Record<string, string> = {
  a_organiser: 'À organiser',
  en_preparation: 'En préparation',
  en_attente_validation_client: 'En attente validation client',
  planifie: 'Planifié',
  en_cours: 'En cours',
  terminee: 'Terminé',
  incident: 'Incident / problème',
}

// Couleurs Tailwind pour chaque colonne Kanban
export const OPERATIONAL_MISSION_STATUS_COLORS: Record<string, {
  dot: string
  badge: string
  border: string
  bg: string
  text: string
}> = {
  a_organiser: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700', border: 'border-l-slate-400', bg: 'bg-slate-50/50', text: 'text-slate-700' },
  en_preparation: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', border: 'border-l-blue-500', bg: 'bg-blue-50/30', text: 'text-blue-700' },
  en_attente_validation_client: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', border: 'border-l-amber-500', bg: 'bg-amber-50/30', text: 'text-amber-700' },
  planifie: { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700', border: 'border-l-indigo-500', bg: 'bg-indigo-50/30', text: 'text-indigo-700' },
  en_cours: { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700', border: 'border-l-violet-500', bg: 'bg-violet-50/30', text: 'text-violet-700' },
  terminee: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', border: 'border-l-emerald-500', bg: 'bg-emerald-50/30', text: 'text-emerald-700' },
  incident: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700', border: 'border-l-rose-500', bg: 'bg-rose-50/30', text: 'text-rose-700' },
}

// Mapping legacy MissionStatus ↔ OperationalMissionStatus (pour compatibilité pages anciennes)
export const LEGACY_TO_OPERATIONAL: Record<string, string> = {
  prevue: 'planifie',
  en_cours: 'en_cours',
  terminee: 'terminee',
  a_valider: 'en_cours',
  probleme_signale: 'incident',
  annulee: 'a_organiser',
}

export const OPERATIONAL_TO_LEGACY: Record<string, string> = {
  a_organiser: 'prevue',
  en_preparation: 'prevue',
  en_attente_validation_client: 'prevue',
  planifie: 'prevue',
  en_cours: 'en_cours',
  terminee: 'terminee',
  incident: 'probleme_signale',
}

export const SKILL_LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  expert: 'Expert',
}

export const SKILL_LEVEL_COLORS: Record<string, string> = {
  debutant: 'bg-slate-100 text-slate-600',
  intermediaire: 'bg-blue-100 text-blue-700',
  expert: 'bg-violet-100 text-violet-700',
}

export const CERTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  machine: 'Machine',
  hauteur: 'Travail en hauteur',
  chimie: 'Produits chimiques',
  permis: 'Permis de conduire',
  autre: 'Autre',
}

export const FATIGUE_LABEL_COLORS: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  charge: 'bg-amber-100 text-amber-700',
  surcharge: 'bg-orange-100 text-orange-700',
  burnout: 'bg-rose-100 text-rose-700',
}

export const FATIGUE_LABEL_TEXT: Record<string, string> = {
  ok: 'OK',
  charge: 'Chargé',
  surcharge: 'Surchargé',
  burnout: 'Burnout',
}

// Catalogue d'expertises de la branche nettoyage
export const CLEANING_EXPERTISES = [
  'bureaux',
  'vitres',
  'moquette',
  'terrasse',
  'fin_de_chantier',
  'sols_mecanises',
  'parking',
  'desinfection',
  'cuisine_professionnelle',
  'sanitaires',
  'industrie',
  'medical',
] as const

export const EXPERTISE_LABELS: Record<string, string> = {
  bureaux: 'Bureaux',
  vitres: 'Vitres',
  moquette: 'Moquette',
  terrasse: 'Terrasse',
  fin_de_chantier: 'Fin de chantier',
  sols_mecanises: 'Sols mécanisés',
  parking: 'Parking',
  desinfection: 'Désinfection',
  cuisine_professionnelle: 'Cuisine pro',
  sanitaires: 'Sanitaires',
  industrie: 'Industrie',
  medical: 'Médical',
}
