import { createBrowserClient } from '@supabase/ssr'

// NOTE: Not used by the app yet — the auth/data layer runs on a dummy
// provider (see src/lib/auth) until real auth is wired in. This client is
// kept ready so flipping the switch is a one-place change.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient(url, key)
}
