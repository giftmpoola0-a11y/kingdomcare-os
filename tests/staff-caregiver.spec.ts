import { expect, test } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'
const E2E_CAREGIVER_EMAIL = process.env.E2E_CAREGIVER_EMAIL
const E2E_CAREGIVER_PASSWORD = process.env.E2E_CAREGIVER_PASSWORD

test('caregiver can access staff workspace but not staff management', async ({ page }) => {
  test.skip(
    !E2E_CAREGIVER_EMAIL || !E2E_CAREGIVER_PASSWORD,
    'Set E2E_CAREGIVER_EMAIL and E2E_CAREGIVER_PASSWORD to run the caregiver staff workspace smoke test.'
  )

  await page.goto(`${BASE}/auth/sign-in?next=${encodeURIComponent('/staff')}`, {
    waitUntil: 'load',
  })
  await page.locator('#email').fill(E2E_CAREGIVER_EMAIL!)
  await page.locator('#password').fill(E2E_CAREGIVER_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/\/staff$/, { timeout: 20000 })
  await expect(page.locator('.v0-dashboard-theme.dark')).toBeVisible()
  await expect(page.getByRole('heading', { name: /caregiver workspace/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /open care tasks/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /active residents/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^shift reports$/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^recent shift reports$/i })).toBeVisible()

  const createShiftReportLink = page.getByRole('link', { name: /create shift report/i }).first()
  const viewShiftReportsLink = page.getByRole('link', { name: /view shift reports/i }).first()
  const reportIncidentLink = page.getByRole('link', { name: /report incident/i }).first()
  await expect(createShiftReportLink).toBeVisible()
  await expect(viewShiftReportsLink).toBeVisible()
  await expect(reportIncidentLink).toBeVisible()
  await expect(createShiftReportLink).toHaveAttribute('href', '/shifts/new')
  await expect(viewShiftReportsLink).toHaveAttribute('href', '/shifts')
  await expect(reportIncidentLink).toHaveAttribute('href', '/incidents/new')

  await reportIncidentLink.click()
  await page.waitForURL(/\/incidents\/new$/, { timeout: 20000 })
  await expect(page.getByRole('heading', { name: /new incident/i })).toBeVisible()
  await expect(page.getByLabel(/incident type/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /save incident/i })).toBeVisible()

  await page.goto(`${BASE}/staff/manage`, { waitUntil: 'load' })
  await page.waitForURL(/\/staff$/, { timeout: 20000 })
  await expect(page.getByRole('heading', { name: /caregiver workspace/i })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/staff management/i)
})
