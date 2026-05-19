'use server'

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server-guard'
import { toUserMessage } from '@/lib/errors/user-message'

/**
 * P2.4 / BUG-MAJ-06 — Allocate a unique, persistent quote number for the
 * current tenant. Format DEV-YYYY-NNNN, atomic per (company, year).
 *
 * The underlying RPC is gated by RLS via current_company_id(), but we add a
 * requirePermission('opportunity:write') guard in front so an authenticated
 * non-sales user (agent, etc.) can't burn counter values just by hitting
 * the action. Defence in depth — see audit_logs for traceability.
 *
 * Falls back to a UUID-derived string only when Supabase is unconfigured
 * (dummy mode for /signup smoke tests). The fallback is uniqueness-by-prob,
 * not by counter — it should never reach a real comptabilité.
 *
 * See supabase/migrations/20260520000000_quote_number_sequence.sql for the
 * underlying RPC + counter table.
 */
export async function generateQuoteNumber(): Promise<
  | { ok: true; number: string }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: true, number: `DEV-LOCAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }
  }
  const gate = await requirePermission('opportunity:write')
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = await createServerClient()
  if (!supabase) {
    return { ok: false, error: 'Supabase indisponible. Réessaie dans un instant.' }
  }

  const { data, error } = await supabase.rpc('generate_quote_number')
  if (error) {
    console.error('[quotes] generate_quote_number RPC failed:', error)
    return {
      ok: false,
      error: toUserMessage(
        error,
        "Génération du numéro de devis impossible. Réessaie ou contacte le support.",
      ),
    }
  }

  if (typeof data !== 'string' || !data) {
    return { ok: false, error: 'Numéro de devis invalide retourné par le serveur.' }
  }
  return { ok: true, number: data }
}
