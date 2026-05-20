import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Production safety check. In production runtime we MUST have Supabase
 * configured — otherwise the app silently falls back to "dummy auth" mode
 * (the dev fallback in src/lib/auth/context.tsx + src/proxy.ts), which
 * disables every RLS check and exposes data across tenants.
 *
 * Called lazily from createServerClient / createServiceRoleClient so we
 * don't break `next build` (which collects routes ahead of time with no
 * env vars set). The relevant guarantee is that no request can be served
 * in production without Supabase configured.
 */
function assertSupabaseConfiguredInProduction(): void {
  if (process.env.NODE_ENV !== 'production') return
  // NEXT_PHASE is "phase-production-build" during `next build` — we skip
  // the check then so the bundler can collect route metadata without envs.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length > 0) {
    throw new Error(
      `Runtime refusé : variables Supabase manquantes [${missing.join(', ')}]. ` +
      `Configurer côté Vercel avant déploiement — l'app ne doit jamais tourner en dummy mode en prod.`,
    )
  }
}

export async function createServerClient() {
  assertSupabaseConfiguredInProduction()
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
  assertSupabaseConfiguredInProduction()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !key) return null
  // IMPORTANT : use the plain @supabase/supabase-js createClient here (not
  // the SSR helper) so the request is always Bearer-authenticated as the
  // service_role JWT. createSSRClient pipes the request's cookies into the
  // client, and a stray user/anon session cookie can end up overriding the
  // Authorization header — every subsequent INSERT then hits RLS as the
  // user instead of bypassing as service_role. That's exactly what broke
  // signUpCompany after FORCE ROW LEVEL SECURITY landed (the symptom was
  // "new row violates row-level security policy" on companies INSERT).
  //
  // Disable session persistence + auto-refresh too — server-side clients
  // don't have a place to put a refreshed JWT, and service_role tokens
  // don't expire anyway.
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
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
 *
 * BUG-002 recovery : same auto-provisioning as requirePermission() in
 * server-guard.ts — when an auth.user lacks a profile, we try to re-create
 * it from user_metadata before failing with a clear "compte non finalisé".
 * Lazy import to avoid `next/server` ↔ server actions cycle at module load.
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
    .maybeSingle()

  if (profile) {
    return {
      userId: user.id,
      email: user.email ?? null,
      companyId: profile.company_id,
      role: profile.role,
    }
  }

  const { ensureProfileForCurrentUser } = await import('@/lib/auth/ensure-profile')
  const recovered = await ensureProfileForCurrentUser()
  if (!recovered) {
    return NextResponse.json(
      { error: 'Compte non finalisé. Termine ton inscription ou contacte le support.' },
      { status: 403 },
    )
  }
  return {
    userId: recovered.userId,
    email: recovered.email,
    companyId: recovered.companyId,
    role: recovered.role,
  }
}
