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

  // Sprint 0 (audit bêta) — la section "Pilotage rentabilité" est masquée
  // dans la sidebar (flag `betaHidden` sur les items dans AppSidebar.tsx).
  // Les pages restent accessibles par URL directe pour qu'on continue à
  // itérer dessus, mais on ne les surface plus aux beta-testers. Le test
  // précédent (sur le tab Tarification) couvre la partie settings.
  test('Rentabilité is hidden from sidebar during private beta', async ({ page }) => {
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByText(/rentabilité client/i)).toHaveCount(0)
    await expect(sidebar.getByText(/analyse des heures/i)).toHaveCount(0)
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
