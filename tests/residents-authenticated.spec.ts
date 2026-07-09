import { expect, test, type Locator, type Page } from '@playwright/test'
import { attachDiagnostics, BASE, signInUser } from './helpers/auth'
import { cleanupPlaywrightResidents, findActivePlaywrightResidents } from './helpers/residents'

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe.serial('Residents Supabase authenticated flow', () => {
  test.beforeEach(async () => {
    await cleanupPlaywrightResidents()
  })

  test.afterEach(async () => {
    await cleanupPlaywrightResidents()
  })

  test('admin can sign in and create, list, view, and clean up a resident', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120000)

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
      const addResidentButton = adminPage.getByRole('button', { name: /^Add Resident$/i }).first()
      await expect(addResidentButton).toBeVisible()

      await addResidentButton.click()
      await adminPage.locator('#residentName').fill(residentName)
      await adminPage.locator('#residentAge').fill('42')
      await adminPage.locator('#residentCareLevel').fill('Moderate support')
      await adminPage.locator('#residentSupportNeeds').fill(supportNeed)
      await adminPage.locator('#residentNotes').fill(residentNote)
      await adminPage.getByRole('button', { name: /^save resident$/i }).click()
      diagnostics.push(`resident create submitted for: ${residentName}`)
      await waitForResidentCreateOutcome(adminPage, residentName, diagnostics)
      await recordStep(adminPage, diagnostics, 'after resident create submit')
      await adminPage.goto(`${BASE}/residents`, { waitUntil: 'load' })
      await recordStep(adminPage, diagnostics, 'after residents reload')

      const residentCard = getResidentCard(adminPage, residentName)
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

      try {
        await cleanupResidentByName(adminPage, residentName, diagnostics)
      } catch (uiCleanupError) {
        diagnostics.push(
          `ui cleanup primary path failed: ${uiCleanupError instanceof Error ? uiCleanupError.message : String(uiCleanupError)}`
        )
      }

      await cleanupPlaywrightResidents({ diagnostics, residentNames: [residentName] })
      const remainingResidents = await findActivePlaywrightResidents({
        diagnostics,
        residentNames: [residentName],
      })
      expect(remainingResidents).toHaveLength(0)
      await recordStep(adminPage, diagnostics, 'after cleanup complete')
    } catch (error) {
      const currentUrl = adminPage.url()
      const bodyText = await adminPage.locator('body').innerText().catch(() => '')
      diagnostics.push(`failure url: ${currentUrl}`)
      diagnostics.push(`unexpected sign-in visible: ${currentUrl.includes('/auth/sign-in')}`)
      diagnostics.push(`body excerpt: ${bodyText.slice(0, 1200).replace(/\s+/g, ' ').trim()}`)
      console.log('Resident flow diagnostics:\n' + diagnostics.join('\n'))
      await attachDiagnostics(testInfo, 'resident-flow-diagnostics', diagnostics)
      throw error
    } finally {
      await cleanupResidentByName(adminPage, residentName, diagnostics).catch((cleanupError) => {
        diagnostics.push(
          `ui cleanup fallback error: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        )
      })
      await cleanupPlaywrightResidents({ diagnostics, residentNames: [residentName] }).catch((cleanupError) => {
        diagnostics.push(
          `supabase cleanup fallback error: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        )
      })

      if (diagnostics.length > 0) {
        console.log('Resident flow diagnostics (final):\n' + diagnostics.join('\n'))
      }
      await attachDiagnostics(testInfo, 'resident-flow-diagnostics', diagnostics)
      await adminContext.close().catch(() => {})
    }
  })
})

async function waitForResidentCreateOutcome(
  page: Page,
  residentName: string,
  diagnostics: string[] = []
) {
  const residentCard = getResidentCard(page, residentName)
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
  const residentCard = getResidentCard(page, residentName)
  const deleteDialog = getResidentDeleteDialog(page, residentName)
  const actionErrorAlert = deleteDialog.locator('[role="alert"]').first()

  const outcome = await Promise.race([
    expect(residentCard).toBeHidden({ timeout: 20000 }).then(() => 'resident-hidden'),
    deleteDialog.waitFor({ state: 'hidden', timeout: 20000 }).then(() => 'dialog-closed'),
    actionErrorAlert.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
  ]).catch(() => 'timeout')

  const currentUrl = page.url()
  const residentCount = await residentCard.count().catch(() => 0)
  const dialogVisible = await deleteDialog.isVisible().catch(() => false)

  if ((outcome === 'resident-hidden' || outcome === 'dialog-closed') && residentCount === 0) {
    return
  }

  const visibleError =
    outcome === 'error'
      ? (await actionErrorAlert.textContent())?.trim() ?? ''
      : ''
  diagnostics.push(`resident delete outcome: ${outcome}`)
  diagnostics.push(`resident delete current url: ${currentUrl}`)
  diagnostics.push(`resident delete visible count: ${residentCount}`)
  diagnostics.push(`resident delete dialog visible: ${dialogVisible}`)
  diagnostics.push(`resident delete visible error: ${visibleError || 'none'}`)

  throw new Error(
    [
      'Resident delete did not finish successfully.',
      `Outcome: ${outcome}.`,
      `Current URL: ${currentUrl}.`,
      `Dialog visible: ${dialogVisible}.`,
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
    const visibleError = await page.locator('main p').filter({ hasText: /unable to sign in|unable to reach|invalid|required/i }).first().textContent().catch(() => '')
    throw new Error(
      [
        `Unexpected redirect to sign-in during ${label}.`,
        `Current URL: ${url}.`,
        `Visible error: ${visibleError?.trim() || 'none'}.`,
      ].join(' ')
    )
  }
}

async function cleanupResidentByName(page: Page, residentName: string, diagnostics: string[]) {
  diagnostics.push(`cleanup target resident: ${residentName}`)

  if (page.url().includes('/auth/sign-in')) {
    diagnostics.push('cleanup re-authenticating admin user')
    await signInUser(page, E2E_TEST_EMAIL!, E2E_TEST_PASSWORD!, '/residents', diagnostics)
  }

  await page.goto(`${BASE}/residents`, { waitUntil: 'load' })

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const residentCard = getResidentCard(page, residentName)
    const residentCount = await residentCard.count().catch(() => 0)
    diagnostics.push(`cleanup attempt ${attempt} visible count: ${residentCount}`)

    if (residentCount === 0) {
      diagnostics.push(`cleanup resident removed by attempt ${attempt}`)
      return
    }

    await expect(residentCard).toBeVisible()
    await residentCard.getByRole('button', { name: /^delete$/i }).click()

    const deleteDialog = getResidentDeleteDialog(page, residentName)
    await expect(deleteDialog).toBeVisible()
    await expect(deleteDialog.getByText(residentName, { exact: true })).toBeVisible()

    const confirmDeleteButton = deleteDialog.getByRole('button', { name: /^delete resident$/i })
    await confirmDeleteButton.click()
    await waitForResidentDeleteOutcome(page, residentName, diagnostics)

    await page.goto(`${BASE}/residents`, { waitUntil: 'load' })
    await page.getByRole('heading', { name: /resident profiles/i }).waitFor({ state: 'visible', timeout: 10000 })
  }

  const remainingCount = await getResidentCard(page, residentName).count().catch(() => 0)
  diagnostics.push(`cleanup remaining count after retries: ${remainingCount}`)

  if (remainingCount > 0) {
    throw new Error(`Cleanup could not remove resident ${residentName}.`)
  }
}

function getResidentCard(page: Page, residentName: string): Locator {
  return page.locator('article').filter({
    has: page.getByRole('heading', { name: new RegExp(`^${escapeRegExp(residentName)}$`) }),
  }).first()
}

function getResidentDeleteDialog(page: Page, residentName: string): Locator {
  return page.getByRole('alertdialog').filter({
    has: page.getByText(residentName, { exact: true }),
  }).first()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


