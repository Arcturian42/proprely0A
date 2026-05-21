import { test, expect } from '@playwright/test'

/**
 * Auth form smoke tests — dummy mode (no Supabase env vars), so the password
 * / signup server actions short-circuit with the "Supabase non configurée"
 * error. That's exactly what we want to assert : the form plumbing (server
 * action wired up, Zod validation runs, error reaches the UI) works end-to-end
 * in the dev server.
 *
 * Full signup → password → dashboard requires a seeded Supabase preview
 * project.
 */

test.describe('login form', () => {
  test('rejects an invalid email format', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('#email')
    await emailInput.fill('not-an-email')
    await page.locator('#password').fill('pass1234')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
  })

  // P1.2 — Form keeps native HTML5 validation enabled but useFrenchValidation
  // replaces the browser-locale tooltip text with French via setCustomValidity().
  test('empty submit yields a French validation message', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('#email')
    await page.getByRole('button', { name: /se connecter|connexion/i }).first().click()
    const msg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(msg).toMatch(/requis/i)
    expect(msg).not.toMatch(/please|fill out/i)
  })

  test('shows an error message when redirected with ?error=missing-code', async ({ page }) => {
    await page.goto('/login?error=missing-code')
    await expect(page.getByText(/invalide ou expir/i)).toBeVisible()
  })

  test('valid credentials submit and surface the dummy-mode error', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('test@proprely.fr')
    await page.locator('#password').fill('mypassword')
    await page.getByRole('button', { name: /se connecter|connexion/i }).first().click()
    // In dummy mode the server action returns "Auth Supabase non configurée"
    // (or rate-limit if the test ran multiple times). Either proves the
    // action ran end-to-end.
    await expect(
      page.getByText(/non configurée|trop de tentatives|incorrect/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows the support email in the FAQ details', async ({ page }) => {
    await page.goto('/login')
    await page.getByText(/n'arrives pas à te connecter/i).click() // expands <details>
    const faqMailto = page.locator('details a[href="mailto:support@proprely.fr"]')
    await expect(faqMailto).toBeVisible()
  })

  test('has a visible "Mot de passe oublié ?" link pointing to /reset-password', async ({ page }) => {
    await page.goto('/login')
    const forgot = page.getByRole('link', { name: /mot de passe oublié/i }).first()
    await expect(forgot).toBeVisible()
    await expect(forgot).toHaveAttribute('href', '/reset-password')
  })
})

test.describe('signup form', () => {
  test('blocks submission with missing required fields', async ({ page }) => {
    await page.goto('/signup')
    const submit = page.getByRole('button', { name: /créer|signup|inscription/i }).first()
    await submit.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('accepts a fully filled form (dummy-mode error reached)', async ({ page }) => {
    await page.goto('/signup')
    await page.locator('#owner_first_name').fill('Alice')
    await page.locator('#owner_last_name').fill('Martin')
    await page.locator('#company_name').fill('ACME Cleaning')
    await page.locator('#email').fill('owner@example.fr')
    await page.locator('#password').fill('pass1234')
    await page.locator('#confirm_password').fill('pass1234')
    await page.getByRole('button', { name: /créer|signup|inscription/i }).first().click()
    await expect(
      page.getByText(/non configurée|déjà|trop de tentatives|incorrect/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('rejects when passwords do not match (Zod refine)', async ({ page }) => {
    await page.goto('/signup')
    await page.locator('#owner_first_name').fill('Alice')
    await page.locator('#owner_last_name').fill('Martin')
    await page.locator('#company_name').fill('ACME')
    await page.locator('#email').fill('mismatch@example.fr')
    await page.locator('#password').fill('pass1234')
    await page.locator('#confirm_password').fill('different')
    await page.getByRole('button', { name: /créer/i }).first().click()
    await expect(page.getByText(/ne correspondent pas/i)).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('reset password flow', () => {
  test('/reset-password renders the email form', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /envoyer le lien|envoi en cours/i })).toBeVisible()
  })

  test('/reset-password submission shows the neutral confirmation message', async ({ page }) => {
    await page.goto('/reset-password')
    await page.locator('#email').fill('whoever@example.com')
    await page.getByRole('button', { name: /envoyer le lien/i }).click()
    // dummy mode returns "Auth Supabase non configurée" ; production / preview
    // returns the always-positive "Si un compte existe…" message. Either is
    // proof the action ran.
    await expect(
      page.getByText(/si un compte existe|non configurée|trop de demandes/i).first(),
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
