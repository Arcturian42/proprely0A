import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient, isSupabaseConfigured } from '@/lib/supabase/proxy-client'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/auth/callback',
  '/accept-invitation',
  '/cgu',
  '/confidentialite',
  '/api/auth/signup',
  '/api/health',           // Public liveness probe — for uptime monitors
  '/sentry-example-page',  // Sentry verification — public, not linked from UI
  '/monitoring/tunnel',    // Sentry tunnel route (CSP-friendly proxy)
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isAgentPath(pathname: string): boolean {
  return pathname === '/agent' || pathname.startsWith('/agent/')
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

  // Pas de session + route protégée → redirige vers /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Session + sur /login ou /signup → on charge le rôle pour landing par défaut
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'agent' ? '/agent/mon-agenda' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Role gating : agent ne voit que /agent/* (+ public + auth callback)
  if (user && !isPublicPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) {
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
    }
  }

  return response
}

export const config = {
  matcher: [
    // Tous les chemins sauf les assets statiques et l'API auth callback.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
