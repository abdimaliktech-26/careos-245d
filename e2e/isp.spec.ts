import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('create a service plan and add a service', async ({ page }) => {
  await login(page)
  await page.goto('/clients')
  await page.waitForLoadState('networkidle')
  // Find a real client detail link (UUID), not /clients/new.
  const hrefs = await page.locator('a[href*="/clients/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('href') ?? ''))
  const clientHref = hrefs.find((h) => /\/clients\/[0-9a-f-]{36}$/.test(h))
  expect(clientHref, 'a seeded client link').toBeTruthy()

  await page.goto(`${clientHref}/isp`)
  await page.getByRole('link', { name: /New plan/i }).click()
  await page.waitForURL(/\/isp\/new/, { timeout: 45000 })
  await page.fill('input[name="planType"]', 'CSSP')
  await page.fill('input[name="effectiveDate"]', '2026-01-01')
  await page.getByRole('button', { name: /Create plan/i }).click()
  await page.waitForURL(/\/isp\/[0-9a-f-]{36}/, { timeout: 45000 })
  await expect(page.getByText(/draft/i)).toBeVisible()

  await page.fill('input[name="serviceName"]', 'Personal Care')
  await page.getByRole('button', { name: /^Add$/ }).first().click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Personal Care')).toBeVisible()
})
