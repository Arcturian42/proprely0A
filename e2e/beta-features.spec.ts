import { test, expect } from '@playwright/test'

/**
 * Sprint 0+1 — features ajoutées pour la bêta. Tests dummy mode (sans
 * Supabase) — vérifient que les UI rendent et que les guards défensifs
 * ne crashent pas. Les flows complets avec sessions auth attendront la
 * preview Supabase seedée.
 */

test.describe('Sprint 0 — Validation guards (dummy mode)', () => {
  test('Planning date input has min=today', async ({ page }) => {
    await page.goto('/operations/planning')
    await expect(page.getByRole('heading', { name: /planning/i })).toBeVisible()
    // Le bouton "Planifier" ouvre le dialog avec input date contraint
    await page.getByRole('button', { name: /planifier/i }).first().click()
    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toBeVisible()
    const today = new Date().toISOString().slice(0, 10)
    await expect(dateInput).toHaveAttribute('min', today)
  })

  test('Rentabilité hidden from sidebar but pages still mounted', async ({ page }) => {
    // Sprint 0 a marqué les items Rentabilité `betaHidden`. La sidebar ne
    // les surface plus, mais les pages restent accessibles par URL directe
    // (pour itération V1).
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /rentabilité client/i })).toHaveCount(0)
    // Pages toujours render-ables par URL
    await page.goto('/rentabilite/rentabilite-client')
    await expect(page.getByRole('heading', { name: /rentabilité par client/i })).toBeVisible()
  })
})

test.describe('Sprint 1 — Issue report dialog (dummy mode)', () => {
  test('Missions du jour render with status filter', async ({ page }) => {
    await page.goto('/operations/missions-du-jour')
    await expect(page.getByRole('heading', { name: /missions du jour/i })).toBeVisible()
    // Filter strip rendu (search + agent + status)
    await expect(page.getByPlaceholder(/recherche client.+site.+prestation/i)).toBeVisible()
  })

  // Les boutons "Signaler problème" n'apparaissent qu'au statut `en_cours` :
  // pas testé en dummy mode (mock data ne contient pas forcément ce statut),
  // mais la migration est validée par le `Lint·Typecheck·Test·Build` job.
})

test.describe('Sprint 1 — Lost reason dialog (dummy mode)', () => {
  test('Pipeline kanban renders 6 stages', async ({ page }) => {
    await page.goto('/commercial/pipeline')
    await expect(page.getByRole('heading', { name: /pipeline/i }).first()).toBeVisible()
    // Les 6 stages sont rendus en headers de colonne. Match casse-insensible
    // pour tolérer les variations typographiques.
    for (const stage of ['ouvert', 'découverte', 'proposition', 'négociation', 'gagné', 'perdu']) {
      const regex = new RegExp(stage, 'i')
      await expect(page.getByText(regex).first()).toBeVisible()
    }
  })
})

test.describe('Sprint 1 — Heures & Paie weekly view (dummy mode)', () => {
  test('Heures & Paie page has Détail + Semaine tabs', async ({ page }) => {
    await page.goto('/rh/heures-paie')
    await expect(page.getByRole('heading', { name: /heures.*paie/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /détail/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /vue semaine/i })).toBeVisible()
  })

  test('Heures & Paie filter strip exposes agent + status + month', async ({ page }) => {
    await page.goto('/rh/heures-paie')
    // 3 filtres : agent (select), statut (select), mois (input type=month).
    // Les combobox sont rendus avant le tab content.
    await expect(page.getByRole('combobox').first()).toBeVisible()
    await expect(page.locator('input[type="month"]')).toBeVisible()
  })
})

test.describe('Sprint 3 — Loading skeletons exist', () => {
  // Les loading.tsx sont servis pendant le fetch RSC. En dummy mode le fetch
  // est instantané donc on ne les voit pas — mais on vérifie au moins que
  // les routes répondent toujours 200 (régression catch).
  const ROUTES = [
    '/commercial/pipeline',
    '/commercial/clients-sites',
    '/operations/planning',
    '/operations/missions-du-jour',
    '/operations/sop',
    '/rh/agents',
    '/rh/heures-paie',
  ]

  for (const route of ROUTES) {
    test(`${route} loads cleanly`, async ({ page }) => {
      const res = await page.goto(route)
      expect([200, 304]).toContain(res?.status() ?? 0)
      // Heading apparaît une fois le fetch terminé.
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
  }
})
