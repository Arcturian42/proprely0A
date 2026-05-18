import { test, expect } from '@playwright/test'

/**
 * Smoke for the UX features added in this sprint (dummy mode).
 * Authenticated flows need a seeded Supabase preview — these only check
 * client-side surface that doesn't depend on DB writes.
 */

test.describe('UX additions (dummy mode)', () => {
  test('Cmd+K opens the global search dialog', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('ControlOrMeta+K')
    await expect(
      page.getByPlaceholder(/rechercher un client.+agent.+mission/i),
    ).toBeVisible()
    // Escape closes
    await page.keyboard.press('Escape')
    await expect(
      page.getByPlaceholder(/rechercher un client.+agent.+mission/i),
    ).not.toBeVisible()
  })

  test('Cmd+K shows "tape au moins 2 caractères" hint', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('ControlOrMeta+K')
    await expect(page.getByText(/tape au moins 2 caractères/i)).toBeVisible()
  })

  test('Cmd+K filters results as you type', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('ControlOrMeta+K')
    await page.keyboard.type('eco')
    // EcoClean is the seed company → should match a client/site
    await expect(page.getByText(/aucun résultat|clients|sites/i).first()).toBeVisible()
  })

  test('Settings > Récurrences tab loads without error', async ({ page }) => {
    await page.goto('/parametres?tab=recurrences')
    await expect(page.getByRole('tab', { name: /récurrences/i, selected: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /nouvelle récurrence/i }),
    ).toBeVisible()
  })

  test('CSV import button shows on /rh/agents', async ({ page }) => {
    await page.goto('/rh/agents')
    await expect(page.getByRole('button', { name: /importer csv/i })).toBeVisible()
  })

  test('CSV import button shows on clients tab', async ({ page }) => {
    await page.goto('/commercial/clients-sites')
    await expect(page.getByRole('button', { name: /importer csv/i })).toBeVisible()
  })
})
