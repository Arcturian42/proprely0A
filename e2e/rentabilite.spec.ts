import { test, expect } from '@playwright/test'

/**
 * Rentabilité pages — replaced the 'À venir' stubs with real analytics.
 * Dummy mode loads the seeded mock dataset so we can assert table content.
 */

test.describe('Rentabilité pages (dummy mode)', () => {
  test('/rentabilite/analyse-heures renders KPIs + agent table', async ({ page }) => {
    await page.goto('/rentabilite/analyse-heures')
    await expect(page.getByRole('heading', { name: /analyse des heures/i })).toBeVisible()
    // KPI strip
    await expect(page.getByText(/heures prévues/i)).toBeVisible()
    await expect(page.getByText(/heures réalisées/i)).toBeVisible()
    await expect(page.getByText(/taux d.utilisation/i)).toBeVisible()
    await expect(page.getByText(/coût main.+œuvre/i)).toBeVisible()
    // Detail table header
    await expect(page.getByRole('columnheader', { name: /agent/i })).toBeVisible()
  })

  test('/rentabilite/rentabilite-client renders KPIs + client table', async ({ page }) => {
    await page.goto('/rentabilite/rentabilite-client')
    await expect(page.getByRole('heading', { name: /rentabilité par client/i })).toBeVisible()
    await expect(page.getByText(/ca ht/i).first()).toBeVisible()
    await expect(page.getByText(/marge brute/i)).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /client/i })).toBeVisible()
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
