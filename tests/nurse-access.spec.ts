import { expect, test } from '@playwright/test'
import { BASE, signInUser, attachDiagnostics } from './helpers/auth'

const E2E_NURSE_EMAIL = process.env.E2E_NURSE_EMAIL
const E2E_NURSE_PASSWORD = process.env.E2E_NURSE_PASSWORD

test.describe.serial('nurse role access', () => {
  test('nurse can access allowed clinical and operational routes', async ({ page }, testInfo) => {
    test.skip(
      !E2E_NURSE_EMAIL || !E2E_NURSE_PASSWORD,
      'Set E2E_NURSE_EMAIL and E2E_NURSE_PASSWORD to run the nurse role-access tests.'
    )

    const diagnostics: string[] = []

    try {
      await signInUser(page, E2E_NURSE_EMAIL!, E2E_NURSE_PASSWORD!, '/staff', diagnostics)
      await expect(page.getByRole('heading', { name: /nurse workspace/i })).toBeVisible()

      await page.goto(`${BASE}/tasks/new`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/tasks\/new$/)
      await expect(page.getByRole('heading', { name: /new task/i })).toBeVisible()

      await page.goto(`${BASE}/incidents/new`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/incidents\/new$/)
      await expect(page.getByRole('heading', { name: /new incident/i })).toBeVisible()

      await page.goto(`${BASE}/residents`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/residents$/)
      await expect(page.getByRole('heading', { name: /resident profiles/i })).toBeVisible()

      await page.goto(`${BASE}/shifts`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/shifts$/)
      await expect(page.getByRole('heading', { name: /^shifts$/i })).toBeVisible()

      await page.goto(`${BASE}/tasks`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/tasks$/)
      await expect(page.getByRole('heading', { name: /daily tasks/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /create task/i }).first()).toBeVisible()

      await page.goto(`${BASE}/medications`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/medications$/)
      await expect(page.getByRole('heading', { name: /medication management/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /add medication/i })).toBeVisible()
      await expect(page.getByText(/Only care home admins and nurses can manage medications\./i)).toHaveCount(0)

      const medicationAlarms = await page.evaluate(async () => {
        const response = await fetch('/api/chrome/medication-alarms', { cache: 'no-store' })
        return {
          status: response.status,
          payload: await response.json(),
        }
      })
      expect(medicationAlarms.status).toBe(200)
      expect(medicationAlarms.payload.actionHref).toBe('/medications')
      expect(medicationAlarms.payload.actionLabel).toBe('Open medications')
    } catch (error) {
      diagnostics.push(`failure url: ${page.url()}`)
      diagnostics.push(`body excerpt: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 1000).replace(/\s+/g, ' ').trim()}`)
      await attachDiagnostics(testInfo, 'nurse-role-access', diagnostics)
      throw error
    }
  })

  test('nurse cannot stay on staff management', async ({ page }, testInfo) => {
    test.skip(
      !E2E_NURSE_EMAIL || !E2E_NURSE_PASSWORD,
      'Set E2E_NURSE_EMAIL and E2E_NURSE_PASSWORD to run the nurse role-access tests.'
    )

    const diagnostics: string[] = []

    try {
      await signInUser(page, E2E_NURSE_EMAIL!, E2E_NURSE_PASSWORD!, '/staff', diagnostics)
      await page.goto(`${BASE}/staff/manage`, { waitUntil: 'load' })
      await expect(page).toHaveURL(/\/staff$/)
      await expect(page.getByRole('heading', { name: /nurse workspace/i })).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/staff management/i)
    } catch (error) {
      diagnostics.push(`failure url: ${page.url()}`)
      diagnostics.push(`body excerpt: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 1000).replace(/\s+/g, ' ').trim()}`)
      await attachDiagnostics(testInfo, 'nurse-staff-manage-block', diagnostics)
      throw error
    }
  })
})

