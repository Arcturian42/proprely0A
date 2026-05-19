import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import * as Sentry from '@sentry/nextjs'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import { quoteSignedEmail } from '@/lib/email/templates'

/**
 * Docuseal webhook events for signing submissions.
 *
 * See https://www.docuseal.com/docs/api#webhook-events
 *
 * Payload shape (simplified — Docuseal sends slightly different envelopes
 * depending on the event):
 *
 *   {
 *     "event_type": "submission.completed",
 *     "timestamp": "2026-…",
 *     "data": {
 *       "id": 123,                 // submission_id
 *       "status": "completed",
 *       "submitters": [
 *         { "id": 456, "email": "...", "status": "completed", "signed_at": "..." }
 *       ],
 *       "audit_log_url": "https://...",
 *       "completed_documents": [{ "url": "https://..." }]
 *     }
 *   }
 *
 * When we get `submission.completed`, we look up the quote with the matching
 * docuseal_submission_id, flip it to 'signe' and stamp signed_at. The
 * opportunity stage flip + downstream client/site/mission creation is
 * driven by the existing signQuote() flow in the Zustand store, which polls
 * the quote row on next page load (revalidatePath happens via the store
 * mirror in any future server-side signing handler).
 */

interface DocusealEvent {
  event_type?: string
  data?: {
    id?: number | string
    status?: string
    submitters?: Array<{ email?: string; signed_at?: string | null }>
    completed_documents?: Array<{ url?: string }>
  }
}

function extractSubmissionId(body: DocusealEvent): string | null {
  const id = body.data?.id
  return id == null ? null : String(id)
}

/**
 * Verify the HMAC-SHA256 signature Docuseal sends in the X-Docuseal-Signature
 * header. Without this, anyone who can reach the public URL can POST a fake
 * `submission.completed` event and mark any quote as signed (service role
 * bypasses RLS). Use timingSafeEqual to avoid a side-channel.
 *
 * If DOCUSEAL_WEBHOOK_SECRET is unset (dev/staging), signature is skipped —
 * production should always have it configured.
 */
function verifySignature(rawBody: string, headerSignature: string | null): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET
  if (!secret) return true // dev mode — explicit opt-out
  if (!headerSignature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  // Header may be prefixed `sha256=…` or raw hex — strip the prefix defensively.
  const provided = headerSignature.replace(/^sha256=/i, '').trim()
  let providedBuf: Buffer
  try {
    providedBuf = Buffer.from(provided, 'hex')
  } catch {
    return false
  }
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

export async function POST(req: NextRequest) {
  try {
    // Read the raw body once for HMAC verification, then parse it ourselves.
    const rawBody = await req.text()
    const signature = req.headers.get('x-docuseal-signature')
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: DocusealEvent
    try {
      body = JSON.parse(rawBody) as DocusealEvent
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const eventName = body.event_type ?? 'unknown'
    const submissionId = extractSubmissionId(body)

    if (eventName !== 'submission.completed') {
      // Other events (viewed, opened, expired) are noted but no DB write.
      return NextResponse.json({ received: true, eventName })
    }

    if (!submissionId) {
      return NextResponse.json({ error: 'No submission id in event' }, { status: 400 })
    }

    const admin = await createServiceRoleClient()
    if (!admin) {
      // Supabase unconfigured (dummy mode) — webhook is a no-op.
      return NextResponse.json({ received: true, dummy: true })
    }

    const signedUrl = body.data?.completed_documents?.[0]?.url ?? null
    const signedAt = body.data?.submitters?.[0]?.signed_at ?? new Date().toISOString()

    // Fetch the quote we're flipping so we can email the salesperson after.
    // Selecting before update lets us know which company + opportunity it
    // belongs to, since the update query doesn't return the row.
    const { data: quoteRow } = await admin
      .from('quotes')
      .select('id, company_id, quote_number, client_name, opportunity_id, opportunities(created_by)')
      .eq('docuseal_submission_id', submissionId)
      .single<{
        id: string
        company_id: string
        quote_number: string
        client_name: string
        opportunity_id: string
        opportunities: { created_by: string | null } | null
      }>()

    const { error } = await admin
      .from('quotes')
      .update({
        status: 'signe',
        signed_at: signedAt,
        docuseal_signature_url: signedUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('docuseal_submission_id', submissionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify the salesperson if we can identify them and Resend is configured.
    // Best-effort: webhook still returns 200 if the email fails (Docuseal
    // doesn't retry on 5xx and the DB flip already happened).
    if (quoteRow && isResendConfigured()) {
      const creatorId = quoteRow.opportunities?.created_by
      if (creatorId) {
        const { data: profile } = await admin
          .from('profiles')
          .select('email, first_name')
          .eq('id', creatorId)
          .single<{ email: string; first_name: string }>()
        if (profile?.email) {
          const tpl = quoteSignedEmail({
            recipientName: profile.first_name || 'commercial',
            clientName: quoteRow.client_name,
            quoteNumber: quoteRow.quote_number,
            signedAt,
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          })
          await sendEmail({ to: profile.email, ...tpl }).catch(err => {
            // Webhook still returns 200 — the quote is already flipped to
            // 'signe' in the DB and Docuseal doesn't retry on 5xx. Surface
            // the failure to Sentry so a Resend outage doesn't go silent.
            Sentry.captureException(err, {
              tags: { route: 'docuseal/webhook', step: 'salesperson_notify' },
              extra: { submissionId },
            })
          })
        }
      }
    }

    return NextResponse.json({ received: true, submissionId, status: 'signed' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid payload' },
      { status: 400 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/docuseal/webhook',
    accepts: ['submission.completed', 'submission.expired', 'submission.viewed'],
  })
}
