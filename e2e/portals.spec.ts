import { test, expect, type Page } from '@playwright/test'

/**
 * Authenticated portal verification against seeded demo accounts
 * (created by scripts/seed-demo.mjs). Confirms each role can reach its
 * own portal AND is blocked from portals it does not own (RBAC).
 */

const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'
const ACCOUNTS = {
  superAdmin: process.env.DEMO_SUPER_EMAIL ?? 'superadmin@higsi.app',
  orgAdmin: process.env.DEMO_EMAIL ?? 'demo@higsi.app',
  staff: process.env.DEMO_STAFF_EMAIL ?? 'staff@higsi.app',
}

async function login(page: Page, email: string) {
  await page.goto('/auth/login')
  await page.fill('#email', email)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  // Proxy routes to each role's home; just wait until we leave the login page.
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

async function expectBlocked(page: Page, path: string) {
  await page.goto(path)
  // Wrong role → proxy redirects to role home; must NOT stay on the path.
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain(path)
}

test.describe('post-login role routing', () => {
  test('super_admin lands on /super-admin, not the admin dashboard', async ({ page }) => {
    await login(page, ACCOUNTS.superAdmin)
    expect(page.url()).toContain('/super-admin')
    expect(page.url()).not.toContain('/dashboard')
  })

  test('org_admin lands on /dashboard', async ({ page }) => {
    await login(page, ACCOUNTS.orgAdmin)
    expect(page.url()).toContain('/dashboard')
  })
})

test.describe('super admin portal', () => {
  test('super_admin can access /super-admin', async ({ page }) => {
    await login(page, ACCOUNTS.superAdmin)
    await page.goto('/super-admin')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/super-admin')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })

  test('super_admin can open settings + organizations', async ({ page }) => {
    await login(page, ACCOUNTS.superAdmin)
    await page.goto('/super-admin/organizations')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/super-admin/organizations')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })
})

test.describe('admin portal', () => {
  test('org_admin can access /admin area', async ({ page }) => {
    await login(page, ACCOUNTS.orgAdmin)
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/admin/settings')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })

  test('org_admin can access dashboard', async ({ page }) => {
    await login(page, ACCOUNTS.orgAdmin)
    expect(page.url()).toContain('/dashboard')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })

  test('org_admin is blocked from /super-admin', async ({ page }) => {
    await login(page, ACCOUNTS.orgAdmin)
    await expectBlocked(page, '/super-admin')
  })
})

test.describe('staff portal', () => {
  test('staff can access client list', async ({ page }) => {
    await login(page, ACCOUNTS.staff)
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/clients')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })

  test('staff can access dashboard', async ({ page }) => {
    await login(page, ACCOUNTS.staff)
    expect(page.url()).toContain('/dashboard')
    await expect(page.locator('main, h1').first()).toBeVisible()
  })

  test('staff is blocked from /super-admin', async ({ page }) => {
    await login(page, ACCOUNTS.staff)
    await expectBlocked(page, '/super-admin')
  })

  test('staff is blocked from /admin', async ({ page }) => {
    await login(page, ACCOUNTS.staff)
    await expectBlocked(page, '/admin/settings')
  })
})
