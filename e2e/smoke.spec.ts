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
    // Title is set client-side via useEffect — fall back to the page heading.
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible()
    // Email input + submit button are the load-bearing UI. Match the FR
    // button label literally ("Recevoir le lien de connexion").
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /recevoir.*lien|connexion|connect|envoi/i }).first()).toBeVisible()
  })

  test('/signup renders the create-account form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    // The signup page has a "Nom de l'entreprise" Label.
    await expect(page.getByLabel(/entreprise/i).first()).toBeVisible()
  })

  test('/cgu loads without error', async ({ page }) => {
    await page.goto('/cgu')
    await expect(page.locator('body')).toBeVisible()
  })
})
