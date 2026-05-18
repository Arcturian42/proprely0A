import { test, expect } from '@playwright/test'

/**
 * Responsive smoke tests at the two most common breakpoints:
 * - 375x667 (iPhone 12 mini-ish, single-column layout)
 * - 768x1024 (iPad portrait, sm: kicks in)
 *
 * The job is to catch the most obvious mobile breakages:
 * - horizontal overflow (page wider than viewport → grey scrollbar of doom)
 * - main heading invisible at default scroll position
 *
 * Authenticated flows still need a seeded Supabase preview; these specs
 * only run on routes that render in dummy mode without auth.
 */

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

// 375px slack: scrollbar + rounding. 768px slack same.
const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 667, slack: 8 },
  { name: 'tablet-768', width: 768, height: 1024, slack: 8 },
] as const

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const route of ROUTES) {
      test(`${route.path} — no horizontal overflow at ${vp.width}px`, async ({ page }) => {
        await page.goto(route.path)
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
        const max = vp.width + vp.slack
        expect(
          scrollWidth,
          `${route.path} overflows horizontally at ${vp.width}px (${scrollWidth}px)`,
        ).toBeLessThanOrEqual(max)
      })
    }
  })
}
