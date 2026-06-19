import { expect, test } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

test.describe('/residents/[residentId] unauthenticated guard', () => {
  test('redirects unauthenticated visitor to sign-in', async ({ page }) => {
    const response = await page.goto(`${BASE}/residents/00000000-0000-0000-0000-000000000000`, {
      waitUntil: 'load',
    })

    expect(page.url()).toContain('/auth/sign-in')
    expect(response?.status()).toBeLessThan(400)
  })

  test('missing resident path does not crash while unauthenticated', async ({ page }) => {
    const response = await page.goto(`${BASE}/residents/not-a-real-resident-id`, {
      waitUntil: 'load',
    })

    expect(page.url()).toContain('/auth/sign-in')
    expect(response?.status()).toBeLessThan(400)
  })
})
