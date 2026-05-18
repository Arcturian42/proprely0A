import type { ServiceCategory } from '@/types'

// Bridge between the legacy ServiceCategory enum (used by QuoteFlow's
// 7-tile picker) and the user-defined service_types table seeded from
// the onboarding wizard's DEFAULT_SERVICES list.
//
// Mapping is one-way: each legacy category points to the canonical
// onboarding service name. The DB-driven engine matches that name
// against service_types.name (case-insensitive, accent-folded) and
// loads the matching pricing_rule if any.
//
// 'autre' has no canonical mapping by design — caller falls back to
// the legacy calculateQuotePrice.

export const SERVICE_CATEGORY_TO_DEFAULT_NAME: Record<
  ServiceCategory,
  string | null
> = {
  bureaux_recurrent: 'Nettoyage de bureaux',
  vitres: 'Nettoyage de vitres',
  terrasse: 'Nettoyage de terrasse',
  sols_mecanises: 'Remise en état des sols mécanisée',
  fin_chantier: 'Nettoyage de fin de chantier',
  moquette: 'Nettoyage de moquette',
  autre: null,
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Finds the service_type id whose name matches the legacy
 * ServiceCategory's canonical onboarding name. Returns null when no
 * match is found (custom service or 'autre').
 */
export function matchServiceTypeForCategory(
  category: ServiceCategory,
  services: { id: string; name: string }[],
): string | null {
  const target = SERVICE_CATEGORY_TO_DEFAULT_NAME[category]
  if (!target) return null
  const normTarget = normalize(target)
  const found = services.find((s) => normalize(s.name) === normTarget)
  return found?.id ?? null
}
