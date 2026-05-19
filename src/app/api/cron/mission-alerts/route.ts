import { NextResponse } from 'next/server'
import { tickMissionReminders, tickMissionLateAlerts } from '@/app/actions/mission-alerts'
import { verifyBearer } from '@/lib/auth/bearer'

// Vercel Cron entrypoint. Schedule twice daily in vercel.json:
// - Early morning UTC for "tomorrow" reminders to land overnight
// - Every 15 min during business hours for late alerts
// Gated by Authorization: Bearer ${CRON_SECRET}.

export async function GET(req: Request) {
  if (!verifyBearer(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') ?? 'both'

  let remindersSent = 0
  let alertsSent = 0
  if (mode === 'reminders' || mode === 'both') {
    const r = await tickMissionReminders()
    remindersSent = r.remindersSent
  }
  if (mode === 'late' || mode === 'both') {
    const r = await tickMissionLateAlerts()
    alertsSent = r.alertsSent
  }

  return NextResponse.json({
    remindersSent,
    alertsSent,
    durationMs: Date.now() - start,
  })
}
