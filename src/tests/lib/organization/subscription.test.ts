import { describe, it, expect } from 'vitest'
import { getSubscriptionState } from '@/lib/organization/subscription'

describe('getSubscriptionState', () => {
  it('returns trial when plan is trial and not expired', () => {
    const result = getSubscriptionState({ plan: 'trial', plan_expires_at: null })
    expect(result.plan).toBe('trial')
    expect(result.isActive).toBe(true)
    expect(result.label).toBe('Trial')
  })

  it('returns active for starter plan with future expiry', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString()
    const result = getSubscriptionState({ plan: 'starter', plan_expires_at: future })
    expect(result.isActive).toBe(true)
    expect(result.label).toBe('Starter')
  })

  it('returns expired when plan_expires_at is in the past', () => {
    const past = new Date(Date.now() - 30 * 86400000).toISOString()
    const result = getSubscriptionState({ plan: 'starter', plan_expires_at: past })
    expect(result.isActive).toBe(false)
    expect(result.statusText).toBe('Expired')
  })

  it('returns expired when plan is expired regardless of date', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString()
    const result = getSubscriptionState({ plan: 'expired', plan_expires_at: future })
    expect(result.isActive).toBe(false)
  })

  it('handles null organization', () => {
    const result = getSubscriptionState(null)
    expect(result.plan).toBe('trial')
    expect(result.isActive).toBe(true)
  })

  it('returns correct labels for all plans', () => {
    expect(getSubscriptionState({ plan: 'pro', plan_expires_at: null }).label).toBe('Pro')
    expect(getSubscriptionState({ plan: 'enterprise', plan_expires_at: null }).label).toBe('Enterprise')
    expect(getSubscriptionState({ plan: 'expired', plan_expires_at: null }).label).toBe('expired')
  })
})
