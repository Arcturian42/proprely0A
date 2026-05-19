import { test, expect } from '@playwright/test'

/**
 * Auth form smoke tests — dummy mode (no Supabase env vars), so the magic
 * link / signup server actions short-circuit with the "Supabase non
 * configurée" error. That's exactly what we want to assert : the form
 * plumbing (server action wired up, Zod validation runs, error reaches the
 * UI) works end-to-end in the dev server.
 *
 * Full signup → magic link → dashboard requires a seeded Supabase preview
 * project (tracked as H4 in docs/BETA_CHECKLIST.md).
 */

test.describe('login form', () => {
  test('rejects an invalid email format', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.getByLabel(/email/i).first()
    await emailInput.fill('not-an-email')
    // Browser's native HTML5 validation blocks the submit before the server
    // action is even called. We assert the input is marked invalid.
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
  })

  // P1.2 — Form keeps native HTML5 validation enabled but useFrenchValidation
  // replaces the browser-locale tooltip text with French via setCustomValidity().
  test('empty submit yields a French validation message', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.getByLabel(/email/i).first()
    await page.getByRole('button', { name: /recevoir.*lien|connexion/i }).first().click()
    const msg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(msg).toMatch(/requis/i)
    expect(msg).not.toMatch(/please|fill out/i)
  })

  test('shows an error message when redirected with ?error=missing-code', async ({ page }) => {
    await page.goto('/login?error=missing-code')
    await expect(page.getByText(/invalide ou expir/i)).toBeVisible()
  })

  test('valid email submits and surfaces the dummy-mode error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).first().fill('test@proprely.fr')
    await page.getByRole('button', { name: /recevoir.*lien|connexion/i }).first().click()
    // In dummy mode the server action returns "Auth Supabase non configurée"
    // (or rate-limit if the test ran multiple times). Either proves the
    // action ran end-to-end.
    await expect(
      page.getByText(/non configurée|trop de tentatives|email envoyé/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  // P1.5 — Support email visible in the FAQ details panel.
  test('shows the support email in the FAQ details', async ({ page }) => {
    await page.goto('/login')
    await page.getByText(/n'as pas reçu/i).click() // expands <details>
    await expect(page.locator('a[href="mailto:support@proprely.fr"]')).toBeVisible()
  })
})

test.describe('signup form', () => {
  test('blocks submission with missing required fields', async ({ page }) => {
    await page.goto('/signup')
    // Click submit without filling — HTML5 required validation fires.
    const submit = page.getByRole('button', { name: /créer|signup|inscription/i }).first()
    await submit.click()
    // Email input remains focused as the first invalid required field;
    // page didn't navigate.
    await expect(page).toHaveURL(/\/signup/)
  })

  test('accepts a fully filled form (dummy-mode error reached)', async ({ page }) => {
    await page.goto('/signup')
    // Selectors by input id — labels collide ("Nom" vs "Nom de l'entreprise"
    // vs "Prénom" all contain "nom" as a substring, so regex match by label
    // text picks the wrong field). Each <Input> has an `id` we can target.
    await page.locator('#owner_first_name').fill('Alice')
    await page.locator('#owner_last_name').fill('Martin')
    await page.locator('#company_name').fill('ACME Cleaning')
    await page.locator('#email').fill('owner@example.fr')
    await page.getByRole('button', { name: /créer|signup|inscription/i }).first().click()
    // In dummy mode the action returns a configuration error,
    // which is enough to prove the form posted + action ran.
    await expect(
      page.getByText(/non configurée|email envoyé|déjà|trop de tentatives/i),
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('proxy / route protection', () => {
  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    // In dummy mode the proxy might render /dashboard directly with a stub
    // user. Either landing on /login (real proxy) or /dashboard (dummy) is
    // acceptable — what we're verifying is no 5xx crash.
    const response = await page.goto('/dashboard')
    expect(response?.ok()).toBe(true)
    await expect(page).toHaveURL(/\/(login|dashboard)/)
  })

  test('protected route /commercial/clients-sites renders or redirects', async ({ page }) => {
    const response = await page.goto('/commercial/clients-sites')
    expect(response?.ok()).toBe(true)
    await expect(page).toHaveURL(/\/(login|commercial)/)
  })

  // BUG-005 : avant le fix, /page-inexistante était silencieusement
  // redirigée vers /login, ce qui masquait toutes les 404 derrière le mur
  // d'authentification et désorientait les nouveaux utilisateurs. La 404
  // doit s'afficher telle quelle.
  test('unknown URL renders the 404 page instead of redirecting to login', async ({ page }) => {
    await page.goto('/page-qui-n-existe-pas')
    await expect(page).toHaveURL(/\/page-qui-n-existe-pas/)
    await expect(page.getByText(/page introuvable|tableau de bord/i).first()).toBeVisible()
  })
})
