import { NextRequest, NextResponse } from 'next/server'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { devTestEmail } from '@/lib/email/templates'
import { requireAuthenticatedProfile } from '@/lib/supabase/server'

/**
 * Smoke test for the Resend integration.
 *
 * Hit GET /api/dev/test-resend?to=someone@example.com
 *
 * - Requires an authenticated user (any role) — keeps the endpoint from
 *   being abused as a spam relay.
 * - Sends a tiny branded test mail via the same wrapper used by invitations
 *   and quote receipts.
 * - Returns the Resend message id on success so you can correlate with
 *   their dashboard.
 *
 * Safe to leave in place — once an account is taken over by spammers, the
 * Resend rate limit (and the auth gate) bounds blast radius.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAuthenticatedProfile()
  if (gate instanceof NextResponse) return gate

  const to = req.nextUrl.searchParams.get('to')
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    return NextResponse.json(
      { ok: false, error: 'query param ?to=<email> requis' },
      { status: 400 },
    )
  }

  if (!isResendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'RESEND_API_KEY non configuré sur ce déploiement' },
      { status: 503 },
    )
  }

  const tpl = devTestEmail({ to })
  const result = await sendEmail({ to, ...tpl })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, id: result.id, to })
}
