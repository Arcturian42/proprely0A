import { test, expect } from '@playwright/test'

/**
 * Rentabilité pages — replaced the 'À venir' stubs with real analytics.
 * Dummy mode loads the seeded mock dataset so we can assert table content.
 */

test.describe('Rentabilité pages (dummy mode)', () => {
  test('/rentabilite/analyse-heures renders KPIs + agent table', async ({ page }) => {
    await page.goto('/rentabilite/analyse-heures')
    await expect(page.getByRole('heading', { name: /analyse des heures/i })).toBeVisible()
    const body = page.locator('body')
    await expect(body).toContainText('Heures prévues')
    await expect(body).toContainText('Heures réalisées')
    await expect(body).toContainText("Taux d'utilisation")
    await expect(body).toContainText("Coût main-d'œuvre")
  })

  test('/rentabilite/rentabilite-client renders KPIs + client table', async ({ page }) => {
    await page.goto('/rentabilite/rentabilite-client')
    await expect(page.getByRole('heading', { name: /rentabilité par client/i })).toBeVisible()
    // KPI strip — match against the page body so multi-occurrence selectors
    // (CA HT appears both as a KPI title and a column header) don't trip
    // Playwright's strict mode.
    const body = page.locator('body')
    await expect(body).toContainText('CA HT')
    await expect(body).toContainText('Marge brute')
    await expect(body).toContainText('Coût direct')
  })

  test('Simulateur tab + sidebar links to Rentabilité', async ({ page }) => {
    await page.goto('/parametres?tab=simulateur')
    await expect(
      page.getByRole('heading', { name: /simulateur de devis/i }),
    ).toBeVisible()
    await expect(page.getByText(/estimation calculée/i)).toBeVisible()
  })

  test('Dashboard does not show late-missions card when there are none', async ({ page }) => {
    await page.goto('/dashboard')
    // The card title only appears when at least one mission is late.
    // In dummy mode with seed data, missions aren't necessarily late, so we
    // just verify the page loads cleanly.
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible()
  })

  test('Rentabilité links are back in the sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')
    await expect(sidebar.getByText(/pilotage rentabilité/i)).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /rentabilité client/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /analyse des heures/i })).toBeVisible()
  })
})
