import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login'); await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]'); await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('EVV settings exposes the operating-state selector', async ({ page }) => {
  await login(page)
  await page.goto('/evv/settings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Operating state')).toBeVisible()
  await expect(page.locator('select[name="state"]')).toBeVisible()
})
