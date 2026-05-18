'use client'

import posthog from 'posthog-js'

/**
 * PostHog analytics. Disabled when NEXT_PUBLIC_POSTHOG_KEY is unset so dev
 * + CI stays quiet. Capture is lightweight (no autocapture) — we only
 * track explicit business events via track() below.
 */

let initialized = false

export function initPostHog(): void {
  if (initialized) return
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    // Explicit-only — no autocapture. Avoids accidentally collecting
    // anything sensitive without a deliberate track() call.
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: false,
    persistence: 'localStorage',
    disable_session_recording: true,
  })
  initialized = true
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.identify(userId, traits)
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.capture(event, props)
}

export function resetAnalytics(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.reset()
}
