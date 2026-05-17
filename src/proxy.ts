import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient, isSupabaseConfigured } from '@/lib/supabase/proxy-client'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/auth/callback',
  '/cgu',
  '/confidentialite',
  '/api/auth/signup',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass-through quand Supabase n'est pas configuré (dev local sans backend).
  // L'app tourne alors en mode dummy provider — voir src/lib/auth/context.tsx.
  if (!isSupabaseConfigured()) {
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

  // Session + sur /login ou /signup → redirige vers /dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
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
