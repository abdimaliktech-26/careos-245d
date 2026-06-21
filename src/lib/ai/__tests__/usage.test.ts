import { describe, test, expect } from 'vitest'
import { currentPeriod, isOverLimit } from '../usage'
import { isFeatureEnabled, type OrgAiSettings } from '../settings'

describe('usage', () => {
  test('period is YYYY-MM', () => { expect(currentPeriod(new Date('2026-06-20T00:00:00Z'))).toBe('2026-06') })
  test('over limit at/above cap', () => { expect(isOverLimit(2000, 2000)).toBe(true); expect(isOverLimit(1999, 2000)).toBe(false) })
})

describe('feature gate', () => {
  const s: OrgAiSettings = { aiEnabled: true, monthlyLimit: 10, features: { evv_insights: false } }
  test('feature explicitly disabled', () => { expect(isFeatureEnabled(s, 'evv_insights')).toBe(false) })
  test('feature default on', () => { expect(isFeatureEnabled(s, 'client_summary')).toBe(true) })
  test('org disabled disables all', () => { expect(isFeatureEnabled({ ...s, aiEnabled: false }, 'client_summary')).toBe(false) })
})
