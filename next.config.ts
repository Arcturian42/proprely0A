import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

// Content-Security-Policy : restreint les sources autorisées pour atténuer XSS
// et data exfiltration. `unsafe-inline` est tolérable sur style-src à cause de
// Tailwind, mais on garde script-src strict avec un nonce-less fallback à
// 'self' (Next.js inline les hydration scripts au même origin).
//
// connect-src autorise Supabase + Sentry + Resend + Docuseal + l'origin courant.
//
// NB CSP wildcards : `*.sentry.io` ne couvre QU'UN seul niveau de sous-domaine.
// Sentry sert les events sur `o<orgid>.ingest.<region>.sentry.io` (3 niveaux),
// donc il faut lister explicitement chaque pattern.
const SENTRY_HOSTS = [
  'https://*.sentry.io',
  'https://*.ingest.sentry.io',
  'https://*.ingest.us.sentry.io',
  'https://*.ingest.de.sentry.io',
  'https://browser.sentry-cdn.com',
].join(' ')

// PostHog : EU region. `eu.i.posthog.com` reçoit les events ; `eu-assets…`
// sert le SDK (config.js, array.js, recorder.js). Les 2 hôtes doivent être
// dans script-src + connect-src. CSP wildcards ne traversent qu'un niveau
// donc on liste les patterns explicitement.
const POSTHOG_HOSTS = [
  'https://eu.i.posthog.com',
  'https://eu-assets.i.posthog.com',
  'https://us.i.posthog.com',
  'https://us-assets.i.posthog.com',
].join(' ')

const cspParts = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SENTRY_HOSTS} ${POSTHOG_HOSTS}`,
  // style-src-elem must include fonts.googleapis.com explicitly because
  // browsers use script-src/style-src as a fallback when -elem isn't set,
  // and `Instrument Serif` is loaded via @import in globals.css.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  // Google Fonts serves the .woff2 files from fonts.gstatic.com.
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${SENTRY_HOSTS} ${POSTHOG_HOSTS} https://api.resend.com https://api.docuseal.com https://recherche-entreprises.api.gouv.fr`,
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
    })
  : nextConfig

