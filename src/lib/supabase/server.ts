import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function createServerClient() {
  if (!isSupabaseConfigured()) return null
  const cookieStore = await cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — ignored, the session
            // is refreshed by proxy.ts middleware on the next request.
          }
        },
      },
    }
  )
}

export async function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !key) return null
  const cookieStore = await cookies()
  return createSSRClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
    auth: { persistSession: false },
  })
}
