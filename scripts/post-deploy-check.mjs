#!/usr/bin/env node
/**
 * P2.5 — Post-deploy smoke test for Proprely.
 *
 * Hits /api/health with the HEALTH_SECRET so the detailed payload is returned,
 * then asserts the critical integrations + tables are healthy. Exits non-zero
 * on failure so this can be wired into a CI step that gates promote/rollback.
 *
 * Usage:
 *   APP_URL=https://your-app.vercel.app HEALTH_SECRET=xxx node scripts/post-deploy-check.mjs
 *
 * Optional env:
 *   TIMEOUT_MS  request timeout (default 10000)
 *   REQUIRE     comma-separated list of integration flags that must be true
 *               (default: supabase,docuseal,resend,docuseal_webhook_secret)
 *
 * Designed to run in a GitHub Action after Vercel reports a successful deploy.
 */

const APP_URL = process.env.APP_URL
const HEALTH_SECRET = process.env.HEALTH_SECRET
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 10_000)
const REQUIRE = (process.env.REQUIRE ?? 'supabase,docuseal,resend,docuseal_webhook_secret')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function die(msg, code = 1) {
  console.error(`[post-deploy-check] ${msg}`)
  process.exit(code)
}

if (!APP_URL) die('Missing APP_URL env var (e.g. APP_URL=https://proprely-xyz.vercel.app)')
if (!HEALTH_SECRET) die('Missing HEALTH_SECRET env var')

const url = `${APP_URL.replace(/\/+$/, '')}/api/health`

const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HEALTH_SECRET}` },
    signal: controller.signal,
  })

  const body = await res.json().catch(() => ({}))
  console.log(`[post-deploy-check] GET ${url} → ${res.status}`)
  console.log(JSON.stringify(body, null, 2))

  if (res.status !== 200) {
    die(`Health endpoint returned ${res.status} (expected 200)`)
  }
  if (!body || body.ok !== true) {
    die(`Health body.ok is not true (got ${JSON.stringify(body?.ok)})`)
  }

  // Check required integrations
  const integrations = body.integrations ?? {}
  for (const key of REQUIRE) {
    if (integrations[key] !== true) {
      die(`Required integration "${key}" is ${integrations[key]} (expected true)`)
    }
  }

  // Check critical tables — onboarding_status is the BUG-BLOQUANT-01 canary.
  const tablesOk = body.tables_ok ?? {}
  if (tablesOk.onboarding_status !== true) {
    die('Critical table "onboarding_status" is not reachable — apply pending migrations.')
  }

  console.log('[post-deploy-check] OK — all integrations and tables healthy.')
} catch (err) {
  if (err && err.name === 'AbortError') die(`Request timed out after ${TIMEOUT_MS}ms`)
  die(`Health request failed: ${err?.message ?? err}`)
} finally {
  clearTimeout(timer)
}
