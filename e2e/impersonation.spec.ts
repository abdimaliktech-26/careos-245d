import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_SUPER_EMAIL ?? 'superadmin@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('super admin can enter an org and see the banner, then exit', async ({ page }) => {
  await login(page)
  await page.goto('/super-admin/organizations')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /Enter as admin/i }).first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 45000 })
  await expect(page.getByText(/Viewing as/i)).toBeVisible()

  await page.getByRole('button', { name: /^Exit$/ }).click()
  await page.waitForURL(/\/super-admin\/organizations/, { timeout: 45000 })
  await expect(page.getByText(/Viewing as/i)).toHaveCount(0)
})
