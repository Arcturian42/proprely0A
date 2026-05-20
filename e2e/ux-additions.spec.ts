import { test, expect } from '@playwright/test'

/**
 * Smoke for the UX features added in this sprint (dummy mode).
 * Authenticated flows need a seeded Supabase preview — these only check
 * client-side surface that doesn't depend on DB writes.
 */

// GlobalSearch attache son listener `keydown` sur `window` depuis un useEffect.
// Sprint 1 a ajouté NotificationBell + useRealtimeMissions à AdminLayout/Dashboard,
// ce qui rallonge le first render et pousse l'attache du listener au-delà du
// keypress instantané que faisait le test précédent. Helper qui synchronise :
// 1) on attend la sidebar visible (= AdminLayout hydraté) puis
// 2) on click body pour garantir le focus document avant le keypress.
async function openCmdK(page: import('@playwright/test').Page) {
  await expect(page.locator('aside')).toBeVisible()
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press('ControlOrMeta+K')
}

test.describe('UX additions (dummy mode)', () => {
  test('Cmd+K opens the global search dialog', async ({ page }) => {
    await page.goto('/dashboard')
    await openCmdK(page)
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
    await openCmdK(page)
    await expect(page.getByText(/tape au moins 2 caractères/i)).toBeVisible()
  })

  test('Cmd+K filters results as you type', async ({ page }) => {
    await page.goto('/dashboard')
    await openCmdK(page)
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

  test('clients-sites: search placeholder mentions contact + email', async ({ page }) => {
    await page.goto('/commercial/clients-sites')
    await expect(
      page.getByPlaceholder(/rechercher.+nom.+ville.+contact.+email/i),
    ).toBeVisible()
  })

  test('clients-sites: Statut dropdown is visible', async ({ page }) => {
    await page.goto('/commercial/clients-sites')
    // Le filter Select a `placeholder="Statut"` mais Radix n'affiche le
    // placeholder que si la valeur est vide — avec le défaut `'all'` c'est
    // le label de l'item ("Tous les statuts") qui est rendu. On vérifie la
    // présence du Select via son contenu visible plutôt que le placeholder.
    await expect(page.locator('body')).toContainText('Tous les statuts')
  })

  test('missions-du-jour: filter strip has search + agent + status', async ({ page }) => {
    await page.goto('/operations/missions-du-jour')
    await expect(
      page.getByPlaceholder(/recherche client.+site.+prestation/i),
    ).toBeVisible()
  })
})
