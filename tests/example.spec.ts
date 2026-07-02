import { expect, test } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

test('signed-in dashboard, shifts, and reports smoke', async ({ page }) => {
  test.skip(
    !E2E_TEST_EMAIL || !E2E_TEST_PASSWORD,
    'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the authenticated smoke flow.'
  )

  await page.goto(`${BASE}/auth/sign-in?next=${encodeURIComponent('/')}`, { waitUntil: 'load' })
  await page.locator('#email').fill(E2E_TEST_EMAIL!)
  await page.locator('#password').fill(E2E_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/\/$/, { timeout: 20000 })
  await expect(page.locator('.v0-dashboard-theme.dark')).toBeVisible()
  await expect(page.getByRole('heading', { name: /good morning/i })).toBeVisible()

  await page.goto(`${BASE}/shifts`, { waitUntil: 'load' })
  await expect(page.getByRole('heading', { name: 'Shifts' })).toBeVisible()

  await page.goto(`${BASE}/reports`, { waitUntil: 'load' })
  await expect(page.getByRole('heading', { name: 'Operational Reports' })).toBeVisible()
})
