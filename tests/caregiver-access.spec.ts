import { expect, test } from '@playwright/test'
import { BASE, signInUser, attachDiagnostics } from './helpers/auth'

const E2E_CAREGIVER_EMAIL = process.env.E2E_CAREGIVER_EMAIL
const E2E_CAREGIVER_PASSWORD = process.env.E2E_CAREGIVER_PASSWORD

test.describe.serial('caregiver role access', () => {
  test('caregiver can access allowed routes and workspace CTAs', async ({ page }, testInfo) => {
    test.skip(
      !E2E_CAREGIVER_EMAIL || !E2E_CAREGIVER_PASSWORD,
      'Set E2E_CAREGIVER_EMAIL and E2E_CAREGIVER_PASSWORD to run the caregiver role-access tests.'
    )

    const diagnostics: string[] = []

    try {
      await signInUser(page, E2E_CAREGIVER_EMAIL!, E2E_CAREGIVER_PASSWORD!, '/staff', diagnostics)
      await expect(page.getByRole('heading', { name: /caregiver workspace/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /report incident/i }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: /create shift report/i }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: /view shift reports/i }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: /create task/i })).toHaveCount(0)

      await page.goto(`${BASE}/incidents/new`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/incidents\/new$/)
      await expect(page.getByRole('heading', { name: /new incident/i })).toBeVisible()

      await page.goto(`${BASE}/tasks`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/tasks$/)
      await expect(page.getByRole('heading', { name: /daily tasks/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /create task/i })).toHaveCount(0)
    } catch (error) {
      diagnostics.push(`failure url: ${page.url()}`)
      diagnostics.push(`body excerpt: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 1000).replace(/\s+/g, ' ').trim()}`)
      await attachDiagnostics(testInfo, 'caregiver-role-access', diagnostics)
      throw error
    }
  })

  test('caregiver is blocked from admin nurse task and staff management routes', async ({ page }, testInfo) => {
    test.skip(
      !E2E_CAREGIVER_EMAIL || !E2E_CAREGIVER_PASSWORD,
      'Set E2E_CAREGIVER_EMAIL and E2E_CAREGIVER_PASSWORD to run the caregiver role-access tests.'
    )

    const diagnostics: string[] = []

    try {
      await signInUser(page, E2E_CAREGIVER_EMAIL!, E2E_CAREGIVER_PASSWORD!, '/staff', diagnostics)

      await page.goto(`${BASE}/staff/manage`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/staff$/)
      await expect(page.getByRole('heading', { name: /caregiver workspace/i })).toBeVisible()

      await page.goto(`${BASE}/tasks/new`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/tasks$/)
      await expect(page.getByRole('heading', { name: /daily tasks/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /create task/i })).toHaveCount(0)
    } catch (error) {
      diagnostics.push(`failure url: ${page.url()}`)
      diagnostics.push(`body excerpt: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 1000).replace(/\s+/g, ' ').trim()}`)
      await attachDiagnostics(testInfo, 'caregiver-blocked-routes', diagnostics)
      throw error
    }
  })
})
