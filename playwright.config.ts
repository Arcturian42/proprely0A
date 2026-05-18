import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — smoke tests only for now (no auth flow), runs against
 * the dev server in dummy mode (no Supabase env vars) so we don't need a
 * preview DB. Add auth-driven tests once a seeded Supabase preview is wired.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    // `next dev` skips the production-safety assertion (which would throw
    // without Supabase configured) and starts up faster than `next build &&
    // next start`. Smoke tests don't need production optimisations — they
    // just verify that public pages render.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
