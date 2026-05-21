import { test, expect } from '@playwright/test'

/**
 * Onboarding smoke tests — dummy mode (no Supabase).
 *
 * In dummy mode the middleware doesn't enforce auth so /onboarding/* is
 * directly accessible. The page rendering itself is the smoke — we just
 * check the wizard surface boots without errors and the right copy is in
 * place. Full authenticated flow tests live elsewhere once a seeded
 * Supabase preview project is available.
 */

test.describe('onboarding wizard (dummy mode)', () => {
  test('/signup shows the multi-step onboarding hint', async ({ page }) => {
    await page.goto('/signup')
    await expect(
      page.getByText(/configure ton espace proprely en quelques minutes/i),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /créer mon entreprise/i })).toBeVisible()
    await expect(page.getByText(/champs obligatoires/i)).toBeVisible()
  })

  test('/login uses the updated copy', async ({ page }) => {
    await page.goto('/login')
    // Copy mise à jour avec PR #44 (migration magic link → email+password).
    // Le CTA principal est désormais "Se connecter".
    await expect(
      page.getByRole('button', { name: /se connecter/i }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /créer mon entreprise/i })).toBeVisible()
  })

  test('/onboarding redirects to step 2', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/onboarding\/2$/)
  })

  test('/onboarding/2 renders the invite-team step', async ({ page }) => {
    await page.goto('/onboarding/2')
    await expect(
      page.getByRole('heading', { name: /inviter tes collaborateurs/i }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /inviter mon équipe/i })).toBeVisible()
    await expect(page.getByText(/passer cette étape/i)).toBeVisible()
  })

  test('/onboarding/3 jumps back to step 2 when prerequisites missing', async ({ page }) => {
    // En mode dummy, status est null donc computeNextIncompleteStep = 2.
    // L'accès à une étape future est bloqué par la page dispatch.
    await page.goto('/onboarding/3')
    await expect(page).toHaveURL(/\/onboarding\/2$/)
  })

  test('progress bar shows 6 steps', async ({ page }) => {
    await page.goto('/onboarding/2')
    const nav = page.getByRole('navigation', { name: /progression de l'onboarding/i })
    await expect(nav).toBeVisible()
    // 6 steps labels
    await expect(nav.getByText(/entreprise/i)).toBeVisible()
    await expect(nav.getByText(/équipe/i)).toBeVisible()
    await expect(nav.getByText(/prestations/i)).toBeVisible()
    await expect(nav.getByText(/tarification/i)).toBeVisible()
    await expect(nav.getByText(/paramètres/i)).toBeVisible()
    await expect(nav.getByText(/confirmation/i)).toBeVisible()
  })
})
