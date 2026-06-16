import { test, expect } from '@playwright/test'

const BASE = 'https://careintake-five.vercel.app'
const EMAIL = 'demo@careintake.app'
const PASSWORD = 'Demo2026!'

test('live logout does not 405', async ({ page }) => {
  const responses: string[] = []
  page.on('response', (r) => {
    if (r.request().method() === 'POST' || r.status() >= 400) {
      responses.push(`${r.request().method()} ${r.status()} ${r.url()}`)
    }
  })

  await page.goto(`${BASE}/auth/login`)
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  const t0 = Date.now()
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 60000 })
  console.log('LOGIN TOOK ms:', Date.now() - t0)

  // Click sign out
  const signOut = page.locator('button[type="submit"]:has-text("Sign out"), form[action="/auth/logout"] button')
  await signOut.first().click()
  await page.waitForLoadState('networkidle')

  console.log('FINAL URL:', page.url())
  console.log('NOTABLE RESPONSES:\n' + responses.join('\n'))

  // Body must not contain the 405 error
  const body = await page.content()
  expect(body).not.toContain('405')
  expect(page.url()).toContain('/auth/login')
})
