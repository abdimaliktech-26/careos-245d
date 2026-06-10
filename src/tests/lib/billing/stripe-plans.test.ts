import { describe, it, expect } from 'vitest'

describe('STRIPE_PLANS', () => {
  it('has three plan tiers', async () => {
    const { STRIPE_PLANS } = await import('@/lib/billing/stripe')
    const keys = Object.keys(STRIPE_PLANS)
    expect(keys).toContain('starter')
    expect(keys).toContain('pro')
    expect(keys).toContain('enterprise')
    expect(keys.length).toBe(3)
  })

  it('each plan has a name and amount', async () => {
    const { STRIPE_PLANS } = await import('@/lib/billing/stripe')
    for (const plan of Object.values(STRIPE_PLANS)) {
      expect(plan.name).toBeTruthy()
      expect(typeof plan.amount).toBe('number')
      expect(plan.amount).toBeGreaterThan(0)
    }
  })

  it('plan amounts increase with tier', async () => {
    const { STRIPE_PLANS } = await import('@/lib/billing/stripe')
    expect(STRIPE_PLANS.starter.amount).toBeLessThan(STRIPE_PLANS.pro.amount)
    expect(STRIPE_PLANS.pro.amount).toBeLessThan(STRIPE_PLANS.enterprise.amount)
  })
})
