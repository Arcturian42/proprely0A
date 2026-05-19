import { NextResponse } from 'next/server'
import { tickRecurrences } from '@/app/actions/recurrences'
import { verifyBearer } from '@/lib/auth/bearer'

// Vercel Cron entrypoint — gated by Authorization: Bearer ${CRON_SECRET}.
// Schedule daily in vercel.json (or hourly if recurrence latency matters).
// Returns count of generated missions for observability / Sentry.

export async function GET(req: Request) {
  if (!verifyBearer(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const { generated } = await tickRecurrences()
  const durationMs = Date.now() - start

  return NextResponse.json({ generated, durationMs })
}
