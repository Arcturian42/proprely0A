import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

// Content-Security-Policy : restreint les sources autorisées pour atténuer XSS
// et data exfiltration. `unsafe-inline` est tolérable sur style-src à cause de
// Tailwind, mais on garde script-src strict avec un nonce-less fallback à
// 'self' (Next.js inline les hydration scripts au même origin).
//
// connect-src autorise Supabase + Sentry + Resend + Docuseal + l'origin courant.
const cspParts = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://browser.sentry-cdn.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.resend.com https://api.docuseal.com https://recherche-entreprises.api.gouv.fr",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspParts.join('; ') },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

// withSentryConfig: source maps upload + tunneling. Only active when
// SENTRY_AUTH_TOKEN is set (CI/prod build); local dev builds without it.
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.NEXT_PUBLIC_SENTRY_DSN)

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring/tunnel',
      disableLogger: true,
    })
  : nextConfig

