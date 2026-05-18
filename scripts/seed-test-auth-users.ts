/**
 * Creates the deterministic test auth.users row referenced by supabase/seed.sql.
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/seed-test-auth-users.ts
 *
 * Designed for the Playwright Supabase preview project, not production.
 * Idempotent: re-running with the same email is a no-op (we check
 * listUsers first).
 */

import { createClient } from '@supabase/supabase-js'

const TEST_OWNER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const TEST_OWNER_EMAIL = 'owner@proprely.fr'

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = existing?.users.find((u) => u.email === TEST_OWNER_EMAIL)
  if (found) {
    console.log(`✓ Test owner already exists (${found.id}, ${found.email})`)
    if (found.id !== TEST_OWNER_ID) {
      console.warn(
        `  ⚠ ID mismatch: expected ${TEST_OWNER_ID}, got ${found.id}.`,
      )
      console.warn(
        '   Drop the existing user from Supabase dashboard or update seed.sql.',
      )
    }
    return
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: TEST_OWNER_EMAIL,
    email_confirm: true,
    user_metadata: { first_name: 'Marie', last_name: 'Dupont' },
  })
  if (error || !created.user) {
    console.error('createUser failed:', error?.message)
    process.exit(1)
  }

  console.log(`✓ Created test owner ${created.user.id}`)
  if (created.user.id !== TEST_OWNER_ID) {
    console.warn(
      `  ⚠ Generated UUID ${created.user.id} differs from seed.sql constant ${TEST_OWNER_ID}.`,
    )
    console.warn(
      '   Either update seed.sql or run scripts/seed-test-auth-users.ts BEFORE generating fresh UUIDs.',
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
