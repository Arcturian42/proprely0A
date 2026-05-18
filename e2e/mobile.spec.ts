import { test, expect } from '@playwright/test'

/**
 * Mobile-viewport smoke tests — dummy mode. iPhone 12 mini-ish (375x667).
 * The job is to catch the most obvious mobile breakages:
 * - horizontal overflow (page wider than viewport → grey scrollbar of doom)
 * - main heading or primary action invisible at default scroll position
 *
 * Authenticated flows still need a seeded Supabase preview; these specs
 * only run on routes that render in dummy mode without auth.
 */

test.use({ viewport: { width: 375, height: 667 } })

const ROUTES = [
  { path: '/login', heading: /connexion/i },
  { path: '/signup', heading: /créer ton entreprise/i },
  { path: '/dashboard', heading: /tableau de bord/i },
  { path: '/operations/missions-du-jour', heading: /missions du jour/i },
  { path: '/operations/planning', heading: /planning/i },
  { path: '/operations/sop', heading: /protocoles|sop/i },
  { path: '/operations/cockpit', heading: /cockpit/i },
  { path: '/commercial/pipeline', heading: /pipeline/i },
  { path: '/commercial/clients-sites', heading: /clients/i },
  { path: '/rh/agents', heading: /agents/i },
  { path: '/rh/heures-paie', heading: /heures/i },
  { path: '/rentabilite/analyse-heures', heading: /analyse des heures/i },
  { path: '/rentabilite/rentabilite-client', heading: /rentabilité par client/i },
  { path: '/parametres', heading: /paramètres/i },
] as const

for (const route of ROUTES) {
  test(`${route.path} — no horizontal overflow at 375px`, async ({ page }) => {
    await page.goto(route.path)
    // Heading visible
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
    // body.scrollWidth should not significantly exceed viewport width.
    // We allow 8px slack for scrollbar / rounding.
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(scrollWidth, `${route.path} overflows horizontally (${scrollWidth}px)`).toBeLessThanOrEqual(383)
  })
}
