import { test, expect } from '@playwright/test'

/**
 * Settings page smoke — dummy mode. Checks the surfaces added in the
 * sprint (Tarification tab, custom error pages, Rentabilité section visible
 * for analytics:read roles) boot without errors.
 */

test.describe('settings + error pages (dummy mode)', () => {
  test('/parametres shows the Tarification tab', async ({ page }) => {
    await page.goto('/parametres')
    await expect(page.getByRole('tab', { name: /tarification/i })).toBeVisible()
  })

  test('Tarification tab renders the pricing settings form', async ({ page }) => {
    await page.goto('/parametres?tab=tarification')
    await expect(page.getByText(/taux horaire main-d.+œuvre/i)).toBeVisible()
    await expect(page.getByText(/marge cible par défaut/i)).toBeVisible()
    await expect(
      page.getByText(/politique consommables/i, { exact: false }),
    ).toBeVisible()
  })

  // Used to be "Rentabilité is hidden" back when the section was gated
  // behind an "À venir" flag. Feature is live since the pre-beta sprint —
  // we now assert the opposite : owner role (dummy mode default) sees the
  // section in the sidebar. See AppSidebar.tsx "Pilotage rentabilité".
  test('Rentabilité is visible in sidebar for owner role', async ({ page }) => {
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByText(/rentabilité client/i)).toBeVisible()
    await expect(sidebar.getByText(/analyse des heures/i)).toBeVisible()
  })

  test('/this-route-does-not-exist renders the custom 404', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist')
    // Next renders a 404 page; the route returns 200 by default but our
    // not-found.tsx contains the FR copy.
    expect([200, 404]).toContain(res?.status() ?? 0)
    await expect(page.getByRole('heading', { name: /page introuvable/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /retour au tableau de bord/i })).toBeVisible()
  })
})
