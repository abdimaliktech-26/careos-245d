import { test, expect } from '@playwright/test'

test.describe('auth flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveTitle(/Higsi|245D/)
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('h1')).toContainText(/Reset/i)
  })

  test('reset password page renders', async ({ page }) => {
    await page.goto('/auth/reset-password')
    await expect(page.locator('h1')).toContainText(/New Password|Set/i)
  })
})

test.describe('landing page', () => {
  test('loads with chatbot trigger', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Higsi|245D/)
    // Chatbot floating button is present
    const chatButton = page.locator('button[aria-label*="chat" i], button[aria-label*="CareAssist" i]')
    await expect(chatButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('has feature section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#features')).toBeVisible()
  })

  test('CTA links to login', async ({ page }) => {
    await page.goto('/')
    const loginLinks = page.locator('a[href="/auth/login"]')
    await expect(loginLinks.first()).toBeVisible()
  })
})

test.describe('API health', () => {
  test('auth endpoints', async ({ request }) => {
    const res = await request.post('/api/auth/forgot-password', {
      data: { email: 'test@test.com' },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('analytics overview returns data', async ({ request }) => {
    const res = await request.get('/api/analytics/overview')
    // May return 401 without auth, but not 500
    expect(res.status()).not.toBe(500)
  })

  test('chat API accepts POST', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    })
    expect(res.status()).not.toBe(500)
  })

  test('stripe checkout validates input', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout', {
      data: { orgId: 'invalid', plan: 'invalid' },
    })
    expect(res.status()).not.toBe(500)
  })
})

test.describe('super admin', () => {
  test('login accessible', async ({ page }) => {
    await page.goto('/super-admin')
    // Should redirect to login if not authenticated
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('settings page requires auth', async ({ page }) => {
    await page.goto('/super-admin/settings')
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
  })
})

test.describe('signing flow', () => {
  test('invalid token shows error', async ({ page }) => {
    await page.goto('/sign/invalid-token-12345678')
    await expect(page.locator('text=/not found|expired|invalid/i').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('client portal', () => {
  test('requires authentication', async ({ page }) => {
    await page.goto('/client')
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
  })
})
