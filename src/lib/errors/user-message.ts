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
 * Extracts a string message from any error shape we see in practice:
 *   - JavaScript Error instances (regular throws)
 *   - PostgrestError / AuthError from supabase-js (plain objects with .message,
 *     NOT Error instances — instanceof Error returns false for them, which was
 *     the original BUG-001 cover-up : every Supabase error fell through to the
 *     generic fallback because we couldn't read its message)
 *   - String errors (rare but happens with fetch / external APIs)
 */
function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const candidate = (err as { message?: unknown }).message
    if (typeof candidate === 'string') return candidate
  }
  return ''
}

// PostgREST error codes that signal a schema cache miss regardless of message text.
// PGRST205: "Could not find the table/view/function in the schema cache" — distinct
// from PGRST106 which is a RLS/relation issue, not a cache staleness issue.
const SCHEMA_CACHE_CODES = new Set(['PGRST205'])

/**
 * True when the underlying error looks like a PostgREST schema-cache miss
 * (table/column/function not found, schema cache stale). Used by callers that
 * want to tag observability events differently for ops-actionable issues vs
 * transient user errors. Re-uses the same regex set as `toUserMessage` so the
 * two helpers can't drift.
 *
 * Checks the PostgREST error code first (PGRST205) so detection is robust even
 * if Supabase changes the message wording in a future release.
 */
export function isSchemaCacheError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' && SCHEMA_CACHE_CODES.has(code)) return true
  }
  const raw = extractMessage(err)
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
// Supabase Auth's built-in rate limit message comes back in English ; we want
// the same French copy as our app-level rateLimit() returns.
const RATE_LIMIT_PATTERN = /for security purposes.*after \d+ seconds?|over_email_send_rate_limit|too many requests|rate limit/i

export function toUserMessage(err: unknown, fallback?: string): string {
  const raw = extractMessage(err)
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
  if (RATE_LIMIT_PATTERN.test(raw)) {
    return 'Trop de tentatives rapprochées. Réessaie dans une minute.'
  }

  // Short, no obvious English-y stack trace → trust the caller-supplied message
  // (e.g. our own Zod issues like "Email invalide" or "Nom requis").
  if (raw.length <= 160 && !/\bat\s+\w|\bstack:|\berror:|undefined|null /i.test(raw)) {
    return raw
  }

  return fallback ?? 'Une erreur est survenue. Réessaie ou contacte le support si le problème persiste.'
}
