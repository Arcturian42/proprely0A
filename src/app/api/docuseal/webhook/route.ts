import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

export async function POST(req: NextRequest) {
  try {
    const body: DocusealEvent = await req.json()
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
