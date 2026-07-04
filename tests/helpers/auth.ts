import { expect, type Page, type TestInfo } from '@playwright/test'

export const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'

const AUTH_ERROR_PATTERN = /unable to sign in|unable to reach|invalid|required/i

export async function signInUser(
  page: Page,
  email: string,
  password: string,
  nextPath = '/',
  diagnostics: string[] = []
) {
  await page.goto(`${BASE}/auth/sign-in?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'load' })
  await page.locator('#email').waitFor({ state: 'visible', timeout: 20000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  const expectedPattern = new RegExp(nextPath === '/' ? '/$' : nextPath.replace('/', '\\/'))
  const outcome = await Promise.race([
    page.waitForURL(expectedPattern, { timeout: 20000 }).then(() => 'expected'),
    page.waitForURL(/\/onboarding(?:\/)?$/, { timeout: 20000 }).then(() => 'onboarding'),
    page.waitForURL(/\/$/, { timeout: 20000 }).then(() => 'home'),
  ]).catch(() => 'timeout')

  if (outcome === 'expected') {
    return
  }

  const currentUrl = page.url()
  const authError = page.locator('main p').filter({ hasText: AUTH_ERROR_PATTERN }).first()
  const visibleError = (await authError.isVisible().catch(() => false))
    ? (await authError.textContent())?.trim() ?? ''
    : ''

  diagnostics.push(`sign-in outcome: ${outcome}`)
  diagnostics.push(`sign-in current url: ${currentUrl}`)
  diagnostics.push(`sign-in visible error: ${visibleError || 'none'}`)

  throw new Error(
    [
      `Sign-in did not reach ${nextPath}.`,
      `Outcome: ${outcome}.`,
      `Current URL: ${currentUrl}.`,
      visibleError ? `Visible error: ${visibleError}.` : 'Visible error: none.',
    ].join(' ')
  )
}

export async function attachDiagnostics(testInfo: TestInfo, name: string, diagnostics: string[]) {
  if (diagnostics.length === 0) {
    return
  }

  await testInfo.attach(name, {
    body: diagnostics.join('\n'),
    contentType: 'text/plain',
  })
}

export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path === '/' ? '/$' : path.replace('/', '\\/')))
}
