import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/health — bi-modal liveness probe.
 *
 * Public (no auth) : returns `{ "status": "ok" }` so uptime monitors can hit
 * it cheaply without leaking internal config (git sha, integration flags).
 * 503 if the app can't talk to Supabase (basic liveness signal).
 *
 * Detailed (Authorization: Bearer <HEALTH_SECRET>) : returns the full
 * integration snapshot plus a `tables_ok` check for critical tables. Used
 * by post-deploy CI scripts and the on-call dashboard.
 */

async function checkTables(): Promise<Record<string, boolean>> {
  const admin = await createServiceRoleClient()
  if (!admin) return { onboarding_status: false }
  // Cheap "does the table exist + is reachable" probe. Failing this means a
  // migration didn't apply — same root cause as BUG-BLOQUANT-01.
  const { error } = await admin.from('onboarding_status').select('company_id', { count: 'exact', head: true }).limit(1)
  return { onboarding_status: !error }
}

export async function GET(req: NextRequest) {
  const supabaseOk = isSupabaseConfigured()

  const authHeader = req.headers.get('authorization')
  const healthSecret = process.env.HEALTH_SECRET
  const isAuthorized = Boolean(
    healthSecret && authHeader === `Bearer ${healthSecret}`,
  )

  if (!isAuthorized) {
    return NextResponse.json(
      { status: supabaseOk ? 'ok' : 'degraded' },
      { status: supabaseOk ? 200 : 503 },
    )
  }

  const integrations = {
    supabase: supabaseOk,
    docuseal: Boolean(process.env.DOCUSEAL_API_KEY),
    docuseal_webhook_secret: Boolean(process.env.DOCUSEAL_WEBHOOK_SECRET),
    resend: Boolean(process.env.RESEND_API_KEY),
    cron_secret: Boolean(process.env.CRON_SECRET),
    sentry: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }
  const tablesOk = supabaseOk ? await checkTables() : { onboarding_status: false }

  // Baseline = the original three (Supabase + Docuseal + Resend) plus the
  // critical-table reachability check from P2 (catches missing migrations).
  // In production we additionally require `docuseal_webhook_secret`
  // (otherwise signed quotes never flip to `signe`) and `cron_secret`
  // (otherwise rappels/alerts/recurrences crons 401). Dev/preview stays
  // lenient on those two so local work without secrets keeps returning 200.
  const isProd = process.env.NODE_ENV === 'production'
  const baseHealthy =
    integrations.supabase &&
    integrations.docuseal &&
    integrations.resend &&
    tablesOk.onboarding_status
  const prodHealthy =
    baseHealthy &&
    integrations.docuseal_webhook_secret &&
    integrations.cron_secret
  const allHealthy = isProd ? prodHealthy : baseHealthy

  return NextResponse.json(
    {
      ok: allHealthy,
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV ?? null,
      git_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timestamp: new Date().toISOString(),
      integrations,
      tables_ok: tablesOk,
    },
    { status: allHealthy ? 200 : 503 },
  )
}
