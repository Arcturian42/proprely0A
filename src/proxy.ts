import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient, isSupabaseConfigured } from '@/lib/supabase/proxy-client'
import { computeNextIncompleteStep, isOnboardingComplete } from '@/lib/onboarding/status'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/signup/confirmation',  // Post-signup "check your inbox" page (P1.3)
  '/auth/callback',
  '/accept-invitation',
  '/cgu',
  '/confidentialite',
  '/api/auth/signup',
  '/api/health',           // Public liveness probe — for uptime monitors
  '/sentry-example-page',  // Sentry verification — public, not linked from UI
  '/monitoring/tunnel',    // Sentry tunnel route (CSP-friendly proxy)
]

// BUG-005 — Top-level segments that require an authenticated session. Anything
// outside this allow-list falls through to Next.js so unknown URLs get the
// real not-found.tsx instead of being silently redirected to /login (which
// hid every 404 behind an auth wall and confused the QA team).
//
// '/' is included so a stale localStorage with no session still lands at
// /login rather than the marketing 404. Keep this list in sync with new
// top-level route groups created under src/app/.
const PROTECTED_PREFIXES = [
  '/',
  '/dashboard',
  '/commercial',
  '/operations',
  '/rh',
  '/rentabilite',
  '/parametres',
  '/onboarding',
  '/agent',
  '/api',  // /api is broadly protected; specific public endpoints listed above
  '/clients', '/sites', '/missions', '/calendrier', '/devis', '/factures',
  '/equipe', '/profil', '/specialites', '/contrats', '/heures', '/paie',
  '/documents', '/app',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PROTECTED_PREFIXES.some(p => p !== '/' && (pathname === p || pathname.startsWith(p + '/')))
}

function isAgentPath(pathname: string): boolean {
  return pathname === '/agent' || pathname.startsWith('/agent/')
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass-through quand Supabase n'est pas configuré (dev local sans backend).
  // L'app tourne alors en mode dummy provider — voir src/lib/auth/context.tsx.
  // En production cela ne doit JAMAIS se produire : assertSupabaseConfiguredInProduction()
  // (dans @/lib/supabase/server) throw au boot si une var manque. Ici on a
  // une seconde ligne de défense en cas d'init partielle / race.
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Supabase not configured — refusing to serve', { status: 503 })
    }
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createProxyClient(request, response)

  // getUser() force un refresh token côté serveur si nécessaire.
  const { data: { user } } = await supabase.auth.getUser()

  // BUG-005 — Pas de session + route protégée connue → /login. Toute autre
  // route (URL inconnue) tombe sur la not-found.tsx de Next plutôt que d'être
  // redirigée silencieusement vers /login.
  if (!user && !isPublicPath(pathname)) {
    if (!isProtectedPath(pathname)) {
      return response
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (!user) {
    return response
  }

  // Une seule query profile pour toute la suite (role + company_id).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single<{ role: 'owner' | 'admin' | 'sales' | 'agent'; company_id: string }>()

  // Session + sur /login ou /signup → redirige vers le landing par défaut
  if (pathname === '/login' || pathname === '/signup') {
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'agent' ? '/agent/mon-agenda' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!profile) return response

  // Onboarding gating : un owner avec onboarding non terminé doit y revenir
  // avant d'accéder à toute autre route protégée. Les non-owners n'ont rien
  // à voir avec le wizard (acceptInvitation gère leur premier login).
  if (profile.role === 'owner') {
    const onOnboarding = isOnboardingPath(pathname)
    const { data: status } = await supabase
      .from('onboarding_status')
      .select(
        'company_id, step_1_completed_at, step_2_team_completed_at, step_2_team_skipped_at, step_3_services_completed_at, step_3_services_skipped_at, step_4_pricing_completed_at, step_4_pricing_skipped_at, step_5_settings_completed_at, step_5_settings_skipped_at, completed_at, created_at, updated_at',
      )
      .eq('company_id', profile.company_id)
      .maybeSingle()
    const done = isOnboardingComplete(status)

    if (!done && !onOnboarding && !isPublicPath(pathname)) {
      const next = computeNextIncompleteStep(status)
      const url = request.nextUrl.clone()
      url.pathname = `/onboarding/${next}`
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (done && onOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  } else if (isOnboardingPath(pathname)) {
    // Non-owners n'ont pas accès au wizard
    const url = request.nextUrl.clone()
    url.pathname = profile.role === 'agent' ? '/agent/mon-agenda' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Role gating : agent ne voit que /agent/* (+ public + auth callback)
  if (profile.role === 'agent' && !isAgentPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/agent/mon-agenda'
    url.search = ''
    return NextResponse.redirect(url)
  }
  if (profile.role !== 'agent' && isAgentPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Tous les chemins sauf les assets statiques et l'API auth callback.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
