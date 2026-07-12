import { expect, test } from '@playwright/test'
import { BASE, signInUser, attachDiagnostics } from './helpers/auth'

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe.serial('admin role access', () => {
  test('admin can access staff management and core operational routes', async ({ page }, testInfo) => {
    test.skip(
      !E2E_TEST_EMAIL || !E2E_TEST_PASSWORD,
      'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the admin role-access tests.'
    )

    const diagnostics: string[] = []

    try {
      await signInUser(page, E2E_TEST_EMAIL!, E2E_TEST_PASSWORD!, '/staff/manage', diagnostics)
      await expect(page.getByRole('heading', { name: /staff management/i })).toBeVisible()

      await page.goto(`${BASE}/tasks/new`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/tasks\/new$/)
      await expect(page.getByRole('heading', { name: /new task/i })).toBeVisible()
      await expect(page.getByLabel(/task title/i)).toBeVisible()

      await page.goto(`${BASE}/incidents/new`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/incidents\/new$/)
      await expect(page.getByRole('heading', { name: /new incident/i })).toBeVisible()
      await expect(page.getByLabel(/incident type/i)).toBeVisible()

      await page.goto(`${BASE}/residents`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/residents$/)
      await expect(page.getByRole('heading', { name: /resident profiles/i })).toBeVisible()

      await page.goto(`${BASE}/shifts`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/shifts$/)
      await expect(page.getByRole('heading', { name: /^shifts$/i })).toBeVisible()

      await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/tasks$/)
      await expect(page.getByRole('heading', { name: /daily tasks/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /create task/i }).first()).toBeVisible()

      await page.goto(`${BASE}/medications`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/medications$/)
      await expect(page.getByRole('heading', { name: /medication management/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /add medication/i })).toBeVisible()
      await expect(page.getByText(/Only care home admins and nurses can manage medications\./i)).toHaveCount(0)
    } catch (error) {
      diagnostics.push(`failure url: ${page.url()}`)
      diagnostics.push(`body excerpt: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 1000).replace(/\s+/g, ' ').trim()}`)
      await attachDiagnostics(testInfo, 'admin-role-access', diagnostics)
      throw error
    }
  })
})
