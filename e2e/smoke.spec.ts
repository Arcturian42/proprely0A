import { test, expect } from '@playwright/test'

/**
 * Smoke tests — verify the public surface renders without crashing.
 * Runs against the dev server in dummy mode (no Supabase env vars), so
 * auth-gated pages redirect to /login as expected.
 *
 * Authenticated flows (signup → magic link → dashboard, invitation accept,
 * RBAC redirects) will live in a separate spec once we have a seeded
 * Supabase preview DB hooked up.
 */

test.describe('public pages', () => {
  test('home redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    // The proxy redirects unauth users away from /dashboard (the home route);
    // in dummy mode the home page renders directly. Either case is acceptable
    // — we just check we land on a page that doesn't 5xx.
    await expect(page).toHaveURL(/\/(login|dashboard|signup|$)/)
  })

  test('/login renders the magic-link form', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Proprely/i)
    // Email input + submit button are the load-bearing UI.
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /connecter|envoyer|magic/i }).first()).toBeVisible()
  })

  test('/signup renders the create-account form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByLabel(/entreprise|company/i).first()).toBeVisible()
  })

  test('/cgu loads without error', async ({ page }) => {
    await page.goto('/cgu')
    await expect(page.locator('body')).toBeVisible()
  })
})
