import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@higsi.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login'); await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]'); await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('AI-using page renders regardless of AI state (no crash)', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main')).toBeVisible()
})
