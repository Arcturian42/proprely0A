import { NextResponse } from 'next/server'

/**
 * Companion endpoint for /sentry-example-page — throws a server-side error
 * that Next.js `onRequestError` (instrumentation.ts) forwards to Sentry.
 */
export async function GET(): Promise<NextResponse> {
  throw new Error('Sentry test — server error from /sentry-example-page/api')
}
