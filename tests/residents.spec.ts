import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

/**
 * Smoke tests for the /residents page after Supabase migration.
 *
 * These tests require the app to be running on localhost:3000.
 * Run with: npm start (after npm run build)
 *
 * Authenticated tests require a real care-home admin session; they are
 * skipped here but can be added once Playwright auth state is configured.
 */

test.describe('/residents — unauthenticated guard', () => {
  test('redirects unauthenticated visitor to sign-in', async ({ page }) => {
    const response = await page.goto(`${BASE}/residents`, { waitUntil: 'load' })

    // The server component redirects to /auth/sign-in for unauthenticated users.
    expect(page.url()).toContain('/auth/sign-in')
    expect(response?.status()).toBeLessThan(400)
  })

  test('sign-in page has a sign-in heading', async ({ page }) => {
    await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'load' })

    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).toBeVisible()
  })
})
