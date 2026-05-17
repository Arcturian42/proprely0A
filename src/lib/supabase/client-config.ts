/**
 * Browser-safe flag : indicates whether Supabase is configured for this build.
 *
 * Both env vars are inlined at build time (prefixed NEXT_PUBLIC_) and shipped
 * to the client bundle, so we can check them without a server roundtrip.
 *
 * Used by the Zustand store to decide whether mutations should be mirrored to
 * Supabase via server actions (real mode) or kept local-only (dummy mode).
 */
export function isSupabaseClient(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
