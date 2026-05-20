import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * GET /api/health — public liveness + dependency check.
 *
 * Returns 200 with a JSON snapshot of which integrations are configured. Used
 * by uptime monitors and the Sentry dashboard widget to verify the deployment
 * has the env vars it needs.
 *
 * No auth required — leak surface is intentional ("Supabase: true/false")
 * since these flags reflect env config visible at network boundary anyway.
 */
export async function GET() {
  const integrations = {
    supabase: isSupabaseConfigured(),
    docuseal: Boolean(process.env.DOCUSEAL_API_KEY),
    docuseal_webhook_secret: Boolean(process.env.DOCUSEAL_WEBHOOK_SECRET),
    resend: Boolean(process.env.RESEND_API_KEY),
    cron_secret: Boolean(process.env.CRON_SECRET),
    sentry: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }
  // Baseline "healthy" stays the same as before so local dev keeps returning
  // 200 without webhook/cron secrets. In production we also require
  // `docuseal_webhook_secret` (otherwise signed quotes never flip to `signe`)
  // and `cron_secret` (otherwise rappels/alerts/recurrences crons 401). Sentry
  // stays informational either way.
  const isProd = process.env.NODE_ENV === 'production'
  const baseHealthy =
    integrations.supabase && integrations.docuseal && integrations.resend
  const prodHealthy =
    baseHealthy && integrations.docuseal_webhook_secret && integrations.cron_secret
  const allHealthy = isProd ? prodHealthy : baseHealthy
  return NextResponse.json(
    {
      ok: allHealthy,
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV ?? null,
      git_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timestamp: new Date().toISOString(),
      integrations,
    },
    { status: allHealthy ? 200 : 503 },
  )
}
