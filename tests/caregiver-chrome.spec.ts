import { expect, test } from '@playwright/test'
import { BASE, attachDiagnostics, signInUser } from './helpers/auth'

const E2E_CAREGIVER_EMAIL = process.env.E2E_CAREGIVER_EMAIL
const E2E_CAREGIVER_PASSWORD = process.env.E2E_CAREGIVER_PASSWORD

const CAREGIVER_PAGES = ['/', '/residents', '/tasks', '/incidents', '/shifts', '/shifts/new'] as const
const EXPECTED_NAV_ITEMS = ['Dashboard', 'Residents', 'Shifts', 'New Shift', 'Tasks', 'Incidents', 'Account'] as const
const HIDDEN_NAV_ITEMS = ['Reports', 'Medications', 'Staff'] as const

test.describe.serial('caregiver shared chrome', () => {
  test.setTimeout(90000)
  test('caregiver chrome stays role-aware across core pages', async ({ page }, testInfo) => {
    test.skip(
      !E2E_CAREGIVER_EMAIL || !E2E_CAREGIVER_PASSWORD,
      'Set E2E_CAREGIVER_EMAIL and E2E_CAREGIVER_PASSWORD to run the caregiver chrome test.'
    )

    const diagnostics: string[] = []
    const snapshots: Array<{
      route: string
      roleBadge: string
      secondary: string
      careHomeName: string
      visibleNav: string[]
    }> = []

    try {
      await signInUser(page, E2E_CAREGIVER_EMAIL!, E2E_CAREGIVER_PASSWORD!, '/', diagnostics)

      for (const route of CAREGIVER_PAGES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'load' })
        const sidebar = page.locator('aside').first()
        await sidebar.waitFor({ state: 'visible', timeout: 20000 })

        const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()
        const navSnapshot: string[] = []

        for (const label of EXPECTED_NAV_ITEMS) {
          if (await sidebar.getByRole('link', { name: new RegExp(label, 'i') }).count()) {
            navSnapshot.push(label)
          }
        }

        diagnostics.push(`route: ${route}`)
        diagnostics.push(`url: ${page.url()}`)
        diagnostics.push(`body excerpt: ${bodyText.slice(0, 500)}`)
        diagnostics.push(`visible caregiver nav: ${navSnapshot.join(', ') || 'none'}`)

        snapshots.push({
          route,
          roleBadge: bodyText.includes('Caregiver') ? 'Caregiver' : 'missing',
          secondary: bodyText.includes('Care Team') ? 'Care Team' : 'missing',
          careHomeName: bodyText.includes('E2E Test Care Home') ? 'E2E Test Care Home' : 'missing',
          visibleNav: navSnapshot,
        })

        await expect(page.locator('body')).toContainText('Caregiver')
        await expect(page.locator('body')).toContainText('Care Team')
        await expect(page.locator('body')).toContainText('E2E Test Care Home')
        await expect(sidebar.getByRole('link', { name: /Residents/i })).toHaveCount(1)

        for (const label of HIDDEN_NAV_ITEMS) {
          await expect(sidebar.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toHaveCount(0)
        }
      }

      console.log(`CAREGIVER_CHROME_SNAPSHOTS ${JSON.stringify(snapshots)}`)
    } catch (error) {
      await attachDiagnostics(testInfo, 'caregiver-chrome-runtime', diagnostics)
      throw error
    }
  })
})
