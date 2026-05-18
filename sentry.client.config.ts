// Sentry client-side bootstrap. Loaded once per browser tab.
// DSN comes from NEXT_PUBLIC_SENTRY_DSN — empty means Sentry is disabled.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // 10% sample on perf traces — bumps if needed once we have real volume.
    tracesSampleRate: 0.1,
    // Don't replay user sessions for now (privacy + cost).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}
