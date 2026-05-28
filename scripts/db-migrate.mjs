#!/usr/bin/env node
/**
 * db-migrate — Apply Supabase migrations and fix schema cache issues (PGRST205).
 *
 * Root causes of PGRST205 "Could not find the table ... in the schema cache":
 *   A. Table does not exist — migrations were never applied → run full migration
 *   B. Table exists but PostgREST cache is stale → run --fix-cache
 *   C. Table exists but roles have no GRANT → run --fix-cache (re-applies grants)
 *
 * Required env vars (loaded from .env.local automatically when run locally):
 *   NEXT_PUBLIC_SUPABASE_URL  — e.g. https://abcdefgh.supabase.co
 *   SUPABASE_ACCESS_TOKEN     — personal access token from
 *                               supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   node scripts/db-migrate.mjs              # apply all migrations + reload cache
 *   node scripts/db-migrate.mjs --fix-cache  # grants + cache reload only (fast)
 *   node scripts/db-migrate.mjs --dry-run    # list migrations without applying
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── Load .env.local (local dev only, ignored in CI where vars are injected) ──
const envLocal = join(ROOT, '.env.local')
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const FIX_CACHE = args.includes('--fix-cache')
const DRY_RUN   = args.includes('--dry-run')

// ─── Env validation ───────────────────────────────────────────────────────────
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN   = process.env.SUPABASE_ACCESS_TOKEN

function die(msg) {
  console.error(`\n[db-migrate] ERROR: ${msg}\n`)
  process.exit(1)
}

if (!SUPABASE_URL)   die('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!ACCESS_TOKEN)   die(
  'Missing SUPABASE_ACCESS_TOKEN\n' +
  '  → Generate one at: https://supabase.com/dashboard/account/tokens\n' +
  '  → Scope: project:sql or full access'
)

// ─── Extract project ref from URL ─────────────────────────────────────────────
let projectRef
try {
  projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
} catch {
  die(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}`)
}
if (!projectRef || projectRef.length < 4) die(`Could not parse project ref from URL: ${SUPABASE_URL}`)

const MGMT_BASE = `https://api.supabase.com/v1/projects/${projectRef}/database`

// ─── SQL runner via management API ────────────────────────────────────────────
async function runSQL(sql, label = '') {
  if (DRY_RUN) {
    console.log(`[dry-run] Would execute: ${label || sql.slice(0, 80).replace(/\s+/g, ' ')}…`)
    return
  }
  const res = await fetch(`${MGMT_BASE}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = body?.message ?? body?.error ?? JSON.stringify(body)
    throw new Error(`HTTP ${res.status}: ${errMsg}`)
  }
  return body
}

// ─── Quick schema-cache fix (--fix-cache mode) ────────────────────────────────
// Re-applies grants + signals PostgREST to reload. Use when PGRST205 fires but
// tables already exist in the DB (case B & C above).
const FIX_CACHE_SQL = `
-- Re-grant privileges so PostgREST can expose the tables
GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE  ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES            IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Signal PostgREST to reload its schema cache immediately
SELECT pg_notify('pgrst', 'reload schema');
`

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n[db-migrate] Project: ${projectRef}`)
  console.log(`[db-migrate] Mode: ${DRY_RUN ? 'dry-run' : FIX_CACHE ? 'fix-cache' : 'full migration'}\n`)

  if (FIX_CACHE) {
    console.log('[db-migrate] Applying grants + reloading PostgREST schema cache…')
    try {
      await runSQL(FIX_CACHE_SQL, 'grants + cache reload')
      console.log('[db-migrate] ✓ Schema cache reloaded. Retry the failing operation.')
    } catch (err) {
      die(`Cache fix failed: ${err.message}`)
    }
    return
  }

  // ─── Full migration run ────────────────────────────────────────────────────
  const migrationsDir = join(ROOT, 'supabase', 'migrations')
  if (!existsSync(migrationsDir)) die(`Migrations directory not found: ${migrationsDir}`)

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()  // alphabetical = chronological (YYYYMMDDHHMMSS_ prefix)

  if (files.length === 0) die(`No .sql files found in ${migrationsDir}`)

  console.log(`[db-migrate] Found ${files.length} migration file(s).\n`)

  let applied = 0
  let failed  = 0

  for (const file of files) {
    const path = join(migrationsDir, file)
    const sql  = readFileSync(path, 'utf8')
    process.stdout.write(`  Applying ${file}… `)
    try {
      await runSQL(sql, file)
      console.log('✓')
      applied++
    } catch (err) {
      console.log(`✗\n    Error: ${err.message}`)
      failed++
      // Continue — migrations are idempotent; a single failure shouldn't block others.
    }
  }

  console.log(`\n[db-migrate] Applied: ${applied}  Failed: ${failed}`)

  // Always reload schema cache after migrations
  console.log('[db-migrate] Reloading PostgREST schema cache…')
  try {
    await runSQL(`SELECT pg_notify('pgrst', 'reload schema');`, 'cache reload')
    console.log('[db-migrate] ✓ Done.\n')
  } catch {
    console.warn('[db-migrate] Warning: cache reload signal failed (non-fatal).\n')
  }

  if (failed > 0) process.exit(1)
}

main().catch((err) => die(err.message))
