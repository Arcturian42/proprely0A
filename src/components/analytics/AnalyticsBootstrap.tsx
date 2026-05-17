'use client'

import { useEffect } from 'react'
import { initPostHog, identifyUser } from '@/lib/analytics/posthog'
import { useCurrentUser } from '@/lib/auth'

/**
 * Mounted once near the root layout. Initializes PostHog (no-op if
 * NEXT_PUBLIC_POSTHOG_KEY is missing) and identifies the current user
 * once auth is resolved.
 */
export function AnalyticsBootstrap() {
  const user = useCurrentUser()
  useEffect(() => {
    initPostHog()
    if (user?.id && user.id !== 'dummy-user') {
      identifyUser(user.id, {
        email: user.email,
        role: user.role,
        company_id: user.company_id,
      })
    }
  }, [user?.id, user?.email, user?.role, user?.company_id])
  return null
}
