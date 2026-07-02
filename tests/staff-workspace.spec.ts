import { expect, test } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3010'
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

test('staff workspace and dashboard routes load', async ({ page }) => {
  test.skip(!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD, 'Missing E2E credentials')

  await page.goto(`${BASE}/auth/sign-in?next=${encodeURIComponent('/')}`, { waitUntil: 'load' })
  await page.locator('#email').fill(E2E_TEST_EMAIL!)
  await page.locator('#password').fill(E2E_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/$/, { timeout: 20000 })

  await expect(page.locator('.v0-dashboard-theme.dark')).toBeVisible()

  await page.goto(`${BASE}/staff`, { waitUntil: 'load' })
  await expect(page.locator('aside').first()).toBeVisible()
  await expect(page.locator('body')).toContainText(/Staff Workspace|Caregiver Workspace|Nurse Workspace/i)

  await page.goto(`${BASE}/staff/manage`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await expect(page.locator('body')).toContainText(/Staff Management/i)

  await page.goto(`${BASE}/v0-dashboard`, { waitUntil: 'load' })
  await expect(page.locator('body')).not.toBeEmpty()
})
