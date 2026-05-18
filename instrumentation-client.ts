// Next.js 15+/Sentry SDK 10+ convention: `instrumentation-client.ts` at the
// project root is auto-imported by the framework to bootstrap the browser
// SDK. Replaces the legacy `sentry.client.config.ts` (which the SDK no
// longer auto-loads).
//
// DSN comes from NEXT_PUBLIC_SENTRY_DSN — empty means Sentry is disabled,
// so local dev without DSN stays quiet.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // 10% sample on perf traces — bump up once we have real volume.
    tracesSampleRate: 0.1,
    // No session replay yet (privacy + cost). Enable later if needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

// Required export for Next.js — instrumentation hooks for client navigation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
