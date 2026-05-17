import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

export interface AuthedProfile {
  userId: string
  email: string | null
  companyId: string
  role: 'owner' | 'admin' | 'sales' | 'agent'
}

/**
 * Gatekeeper for /api/* routes : requires an authenticated user with a profile
 * scoped to a company. Returns the resolved profile OR a NextResponse error to
 * return early. Always pair with `if ('userId' in gate) {...}` typeguard.
 *
 * Usage:
 *   const gate = await requireAuthenticatedProfile()
 *   if (gate instanceof NextResponse) return gate
 *   // gate.companyId is safe to use
 */
export async function requireAuthenticatedProfile(): Promise<AuthedProfile | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Auth non configurée' }, { status: 503 })
  }
  const supabase = await createServerClient()
  if (!supabase) return NextResponse.json({ error: 'Auth indisponible' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  return {
    userId: user.id,
    email: user.email ?? null,
    companyId: profile.company_id,
    role: profile.role,
  }
}
