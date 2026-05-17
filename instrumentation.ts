// Next.js 16 instrumentation hook — runs once per worker. Picks the right
// Sentry config based on which runtime is booting.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Capture errors thrown from request handlers so they reach Sentry even when
// the handler doesn't bubble them up. Forwarded directly to Sentry's helper.
import * as Sentry from '@sentry/nextjs'
export const onRequestError = Sentry.captureRequestError
