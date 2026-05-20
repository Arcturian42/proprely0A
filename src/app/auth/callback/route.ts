import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase-not-configured`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`)
  }

  const supabase = await createServerClient()
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=client-unavailable`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Map the Supabase auth error to a known code consumed by /login (the
    // login page hydrates a French message from this code via
    // AUTH_ERROR_MESSAGES). Don't leak the raw message — it can include
    // schema or internal details depending on Supabase version.
    const code = /expired|invalid.*token|token.*expired/i.test(error.message)
      ? 'expired'
      : /access.*denied/i.test(error.message)
        ? 'access_denied'
        : 'server_error'
    console.error('[auth/callback] exchangeCodeForSession failed:', error)
    return NextResponse.redirect(`${origin}/login?error=${code}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
