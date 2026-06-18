import { describe, test, expect } from 'vitest'
import { canActivate } from '../status'

// The server actions require an authed session (getSession), so they are exercised
// via E2E (Task 8). Here we lock the activation rule the action relies on.
describe('activation rule used by activatePlan', () => {
  test('blocks activation when no services/outcomes', () => {
    expect(canActivate({ effectiveDate: '2026-01-01', serviceCount: 0, outcomeCount: 0 }).ok).toBe(false)
  })
  test('allows activation when complete', () => {
    expect(canActivate({ effectiveDate: '2026-01-01', serviceCount: 2, outcomeCount: 1 }).ok).toBe(true)
  })
})
