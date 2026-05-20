// Maps raw backend errors (Supabase, Postgres, fetch) to French messages safe
// to display to the user. The raw `message` may include schema/table names,
// SQL snippets, or stack frames — none of which should reach the UI.
//
// Keep this pure : no I/O, no logging. Callers can still log the original
// `err` server-side for debugging.

const SCHEMA_PATTERNS = [
  /could not find the table/i,
  /relation "[^"]+" does not exist/i,
  /column "[^"]+" .* does not exist/i,
  /schema cache/i,
  /schema "[^"]+" does not exist/i,
  /function .* does not exist/i,
]

/**
 * True when the underlying error looks like a PostgREST schema-cache miss
 * (table/column/function not found, schema cache stale). Used by callers that
 * want to tag observability events differently for ops-actionable issues vs
 * transient user errors. Re-uses the same regex set as `toUserMessage` so the
 * two helpers can't drift.
 */
export function isSchemaCacheError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return false
  return SCHEMA_PATTERNS.some((p) => p.test(raw))
}

const FK_PATTERN = /violates foreign key constraint/i
const UNIQUE_PATTERN = /duplicate key value violates unique constraint|already exists/i
const CHECK_PATTERN = /violates check constraint/i
const NOT_NULL_PATTERN = /null value in column .* violates not-null/i
const RLS_PATTERN = /new row violates row-level security|permission denied for/i
const JWT_PATTERN = /jwt|invalid token|token expired|not authenticated/i
const NETWORK_PATTERN = /fetch failed|network request failed|timeout|econnrefused|enotfound/i

export function toUserMessage(err: unknown, fallback?: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return fallback ?? 'Une erreur est survenue. Réessaie.'

  if (SCHEMA_PATTERNS.some((p) => p.test(raw))) {
    return 'Service temporairement indisponible (mise à jour en cours). Réessaie dans quelques instants ou contacte le support.'
  }
  if (UNIQUE_PATTERN.test(raw)) {
    return 'Cet enregistrement existe déjà.'
  }
  if (FK_PATTERN.test(raw)) {
    return 'Référence invalide — un élément lié n\'existe plus ou n\'est pas accessible.'
  }
  if (CHECK_PATTERN.test(raw) || NOT_NULL_PATTERN.test(raw)) {
    return 'Données invalides — un champ obligatoire est vide ou contient une valeur non autorisée.'
  }
  if (RLS_PATTERN.test(raw)) {
    return 'Action refusée — tu n\'as pas les droits nécessaires.'
  }
  if (JWT_PATTERN.test(raw)) {
    return 'Session expirée. Reconnecte-toi.'
  }
  if (NETWORK_PATTERN.test(raw)) {
    return 'Erreur réseau. Vérifie ta connexion et réessaie.'
  }

  // Short, no obvious English-y stack trace → trust the caller-supplied message
  // (e.g. our own Zod issues like "Email invalide" or "Nom requis").
  if (raw.length <= 160 && !/\bat\s+\w|\bstack:|\berror:|undefined|null /i.test(raw)) {
    return raw
  }

  return fallback ?? 'Une erreur est survenue. Réessaie ou contacte le support si le problème persiste.'
}
