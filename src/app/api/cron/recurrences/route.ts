import { NextResponse } from 'next/server'
import { tickRecurrences } from '@/app/actions/recurrences'
import { verifyCronRequest } from '@/lib/cron/verify'

// Vercel Cron entrypoint — gated by Authorization: Bearer ${CRON_SECRET}
// with a constant-time comparison (see lib/cron/verify.ts).
// Schedule daily in vercel.json (or hourly if recurrence latency matters).
// Returns count of generated missions for observability / Sentry.

export async function GET(req: Request) {
  const denied = verifyCronRequest(req)
  if (denied) return denied

  const start = Date.now()
  const { generated } = await tickRecurrences()
  const durationMs = Date.now() - start

  return NextResponse.json({ generated, durationMs })
}
