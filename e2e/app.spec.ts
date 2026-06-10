import { test, expect } from '@playwright/test'

test.describe('auth flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('h2')).toContainText('Welcome back')
  })

  test('forgot password link navigates', async ({ page }) => {
    await page.goto('/auth/login')
    await page.click('text=Forgot password')
    await expect(page.locator('h1')).toContainText('Reset Password')
  })

  test('login with invalid email shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'nonexistent@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('navigation', () => {
  test('sidebar has all main nav items', async ({ page }) => {
    await page.goto('/auth/login')
    // This test assumes seeded auth — adjust as needed
    await page.goto('/dashboard')
    await expect(page.locator('nav')).toContainText('Analytics')
    await expect(page.locator('nav')).toContainText('Incidents')
    await expect(page.locator('nav')).toContainText('Claims')
  })
})
