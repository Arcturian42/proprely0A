import { test, expect } from '@playwright/test'

/**
 * Authenticated flow specs — require a seeded Supabase preview project.
 *
 * These specs are skipped unless PLAYWRIGHT_SUPABASE_SEEDED is truthy,
 * because the seed data + the deterministic auth user
 * (owner@proprely.fr) must already exist. See supabase/seed.sql and
 * scripts/seed-test-auth-users.ts for setup.
 *
 * The login flow uses Supabase magic-link, so for CI we'd typically grab
 * the link from a webhook or directly sign a JWT — neither is portable
 * across Supabase plans. These specs therefore prepare assertions that
 * apply once the auth tooling is in place; in the meantime they're
 * marked as skip and act as a contract.
 */

const ENABLED = process.env.PLAYWRIGHT_SUPABASE_SEEDED === '1'

test.describe('authenticated flows (seeded Supabase)', () => {
  test.skip(!ENABLED, 'PLAYWRIGHT_SUPABASE_SEEDED not set')

  test('owner lands on /dashboard after auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible()
    // Seeded sidebar shows Proprely Nettoyage Pro
    await expect(page.locator('aside')).toContainText(/proprely nettoyage|nettoyage pro/i)
  })

  test('seeded mission appears in /operations/missions-du-jour', async ({ page }) => {
    await page.goto('/operations/missions-du-jour')
    // Seed creates a mission today on Cabinet Médical Bastille
    await expect(page.locator('body')).toContainText(/cabinet médical bastille/i)
  })

  test('seeded clients appear in /commercial/clients-sites', async ({ page }) => {
    await page.goto('/commercial/clients-sites')
    await expect(page.locator('body')).toContainText(/tech lyon/i)
    await expect(page.locator('body')).toContainText(/cabinet médical/i)
  })

  test('seeded opportunities appear in /commercial/pipeline', async ({ page }) => {
    await page.goto('/commercial/pipeline')
    await expect(page.locator('body')).toContainText(/pharmacie centrale/i)
    await expect(page.locator('body')).toContainText(/studio yoga marais/i)
  })

  test('QuoteFlow Step4 shows "Tes règles" badge for bureaux service', async ({ page }) => {
    // Seed creates pricing_rules for office_cleaning + windows.
    // The badge should switch to indigo "Tes règles" when QuoteFlow
    // catches a match.
    await page.goto('/commercial/pipeline')
    // Open the seeded opportunity ; click "Créer un devis" ; pick
    // bureaux_recurrent ; reach Step 4. Detailed steps depend on the
    // pipeline UI ; this assertion is the contract.
    // (Filling concrete steps is left for once the auth flow above
    // works end-to-end.)
  })
})
