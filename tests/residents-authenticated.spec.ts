import { expect, test, type Page, type TestInfo } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe.serial('Residents Supabase authenticated flow', () => {
  test('admin can sign in and create, list, view, and clean up a resident', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60000)

    test.skip(
      !E2E_TEST_EMAIL || !E2E_TEST_PASSWORD,
      'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the authenticated residents E2E flow.'
    )

    const token = Date.now()
    const residentName = `Playwright Test Resident ${token}`
    const residentNote = `Supabase resident note ${token}`
    const supportNeed = 'Medication reminders'
    const diagnostics: string[] = []
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    try {
      await signInUser(adminPage, E2E_TEST_EMAIL!, E2E_TEST_PASSWORD!, '/residents', diagnostics)
      await recordStep(adminPage, diagnostics, 'after sign-in')
      await expect(adminPage.getByRole('heading', { name: /resident profiles/i })).toBeVisible()
      const addResidentButton = adminPage.getByRole('button', { name: /^\+ Add Resident$/ }).first()
      await expect(addResidentButton).toBeVisible()

      await addResidentButton.click()
      await adminPage.locator('#residentName').fill(residentName)
      await adminPage.locator('#residentAge').fill('42')
      await adminPage.locator('#residentCareLevel').fill('Moderate support')
      await adminPage.locator('#residentSupportNeeds').fill(supportNeed)
      await adminPage.locator('#residentNotes').fill(residentNote)
      await adminPage.getByRole('button', { name: /^save resident$/i }).click()
      await waitForResidentCreateOutcome(adminPage, residentName, diagnostics)
      await recordStep(adminPage, diagnostics, 'after resident create submit')
      await adminPage.goto(`${BASE}/residents`, { waitUntil: 'load' })
      await recordStep(adminPage, diagnostics, 'after residents reload')

      const residentCard = adminPage.locator('article').filter({ hasText: residentName }).first()
      diagnostics.push(`resident card visible after reload: ${await residentCard.isVisible().catch(() => false)}`)
      await expect(residentCard).toBeVisible()
      await expect(residentCard.getByText('Age 42')).toBeVisible()

      const detailLink = residentCard.getByRole('link', { name: /view profile/i })
      const detailHref = (await detailLink.getAttribute('href')) ?? ''
      diagnostics.push(`resident detail href: ${detailHref || 'missing'}`)
      await detailLink.click()
      await adminPage.waitForURL(/\/residents\/[^/]+$/, { timeout: 20000 })
      await recordStep(adminPage, diagnostics, 'after opening profile')
      await expect(adminPage.getByRole('heading', { name: residentName })).toBeVisible()
      diagnostics.push('profile page displayed resident heading: true')
      await expect(adminPage.getByText(residentNote)).toBeVisible()
      await expect(adminPage.getByText(supportNeed)).toBeVisible()

      await adminPage.goto(`${BASE}/residents`, { waitUntil: 'load' })
      await recordStep(adminPage, diagnostics, 'before cleanup')
      const residentCardForCleanup = adminPage.locator('article').filter({ hasText: residentName }).first()
      await expect(residentCardForCleanup).toBeVisible()
      adminPage.once('dialog', (dialog) => dialog.accept())
      await residentCardForCleanup.getByRole('button', { name: /^delete$/i }).click()
      await waitForResidentDeleteOutcome(adminPage, residentName, diagnostics)
      await recordStep(adminPage, diagnostics, 'after cleanup click')
      await adminPage.goto(`${BASE}/residents`, { waitUntil: 'load' })
      await recordStep(adminPage, diagnostics, 'after cleanup reload')
      await expect(residentCardForCleanup).toHaveCount(0)
      await recordStep(adminPage, diagnostics, 'after cleanup complete')
    } catch (error) {
      const currentUrl = adminPage.url()
      const bodyText = await adminPage.locator('body').innerText().catch(() => '')
      diagnostics.push(`failure url: ${currentUrl}`)
      diagnostics.push(`unexpected sign-in visible: ${currentUrl.includes('/auth/sign-in')}`)
      diagnostics.push(`body excerpt: ${bodyText.slice(0, 1200).replace(/\s+/g, ' ').trim()}`)
      console.log('Resident flow diagnostics:\n' + diagnostics.join('\n'))
      await attachDiagnostics(testInfo, diagnostics)
      throw error
    } finally {
      if (diagnostics.length > 0) {
        console.log('Resident flow diagnostics (final):\n' + diagnostics.join('\n'))
      }
      await attachDiagnostics(testInfo, diagnostics)
      await adminContext.close().catch(() => {})
    }
  })
})

async function signInUser(
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

  const outcome = await Promise.race([
    page.waitForURL(new RegExp(nextPath === '/' ? '/$' : nextPath.replace('/', '\\/')), {
      timeout: 20000,
    }).then(() => 'expected'),
    page.waitForURL(/\/onboarding(?:\/)?$/, { timeout: 20000 }).then(() => 'onboarding'),
    page.waitForURL(/\/$/, { timeout: 20000 }).then(() => 'home'),
    page
      .locator('p.text-red-700')
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => 'error'),
  ]).catch(() => 'timeout')

  if (outcome === 'expected') {
    return
  }

  const currentUrl = page.url()
  const visibleError =
    outcome === 'error'
      ? (await page.locator('p.text-red-700').first().textContent())?.trim() ?? ''
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

async function waitForResidentCreateOutcome(
  page: Page,
  residentName: string,
  diagnostics: string[] = []
) {
  const residentCard = page.locator('article').filter({ hasText: residentName }).first()
  const formErrorAlert = page.locator('main [role="alert"]').filter({
    hasText: /failed|required|valid|unable|only/i,
  }).first()
  const outcome = await Promise.race([
    residentCard.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'resident-visible'),
    page.locator('#residentName').waitFor({ state: 'detached', timeout: 20000 }).then(() => 'closed'),
    formErrorAlert.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
  ]).catch(() => 'timeout')

  const residentVisibleAfterWait = await residentCard.isVisible().catch(() => false)
  if (outcome === 'resident-visible' || outcome === 'closed' || residentVisibleAfterWait) {
    return
  }

  const currentUrl = page.url()
  const visibleError =
    outcome === 'error'
      ? (await formErrorAlert.textContent())?.trim() ?? ''
      : ''
  diagnostics.push(`resident create outcome: ${outcome}`)
  diagnostics.push(`resident create current url: ${currentUrl}`)
  diagnostics.push(`resident create resident visible after wait: ${residentVisibleAfterWait}`)
  diagnostics.push(`resident create visible error: ${visibleError || 'none'}`)

  throw new Error(
    [
      'Resident creation did not finish successfully.',
      `Outcome: ${outcome}.`,
      `Current URL: ${currentUrl}.`,
      visibleError ? `Visible error: ${visibleError}.` : 'Visible error: none.',
    ].join(' ')
  )
}

async function waitForResidentDeleteOutcome(
  page: Page,
  residentName: string,
  diagnostics: string[] = []
) {
  const residentCard = page.locator('article').filter({ hasText: residentName }).first()
  const actionErrorAlert = page.locator('main [role="alert"]').filter({
    hasText: /failed|violates|not found|unable|only/i,
  }).first()

  const outcome = await Promise.race([
    expect
      .poll(async () => {
        await page.goto(`${BASE}/residents`, { waitUntil: 'load' })
        return await residentCard.count()
      }, { timeout: 20000 })
      .toBe(0)
      .then(() => 'resident-hidden'),
    actionErrorAlert.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
  ]).catch(() => 'timeout')

  const currentUrl = page.url()
  const residentCount = await residentCard.count().catch(() => 0)

  if (outcome === 'resident-hidden' || residentCount === 0) {
    return
  }

  const visibleError =
    outcome === 'error'
      ? (await actionErrorAlert.textContent())?.trim() ?? ''
      : ''
  diagnostics.push(`resident delete outcome: ${outcome}`)
  diagnostics.push(`resident delete current url: ${currentUrl}`)
  diagnostics.push(`resident delete visible count: ${residentCount}`)
  diagnostics.push(`resident delete visible error: ${visibleError || 'none'}`)

  throw new Error(
    [
      'Resident delete did not finish successfully.',
      `Outcome: ${outcome}.`,
      `Current URL: ${currentUrl}.`,
      visibleError ? `Visible error: ${visibleError}.` : 'Visible error: none.',
    ].join(' ')
  )
}

async function recordStep(page: Page, diagnostics: string[], label: string) {
  const url = page.url()
  const onSignIn = url.includes('/auth/sign-in')
  diagnostics.push(`${label} url: ${url}`)
  diagnostics.push(`${label} unexpected sign-in: ${onSignIn}`)

  if (onSignIn) {
    const visibleError = await page.locator('p.text-red-700').first().textContent().catch(() => '')
    throw new Error(
      [
        `Unexpected redirect to sign-in during ${label}.`,
        `Current URL: ${url}.`,
        `Visible error: ${visibleError?.trim() || 'none'}.`,
      ].join(' ')
    )
  }
}

async function attachDiagnostics(testInfo: TestInfo, diagnostics: string[]) {
  if (diagnostics.length === 0) {
    return
  }

  await testInfo.attach('resident-flow-diagnostics', {
    body: diagnostics.join('\n'),
    contentType: 'text/plain',
  })
}
