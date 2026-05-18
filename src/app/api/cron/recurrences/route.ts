import { NextResponse } from 'next/server'
import { tickRecurrences } from '@/app/actions/recurrences'

// Vercel Cron entrypoint — gated by Authorization: Bearer ${CRON_SECRET}.
// Schedule daily in vercel.json (or hourly if recurrence latency matters).
// Returns count of generated missions for observability / Sentry.

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const { generated } = await tickRecurrences()
  const durationMs = Date.now() - start

  return NextResponse.json({ generated, durationMs })
}
