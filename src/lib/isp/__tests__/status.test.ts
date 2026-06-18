import { describe, test, expect } from 'vitest'
import { canActivate, nextStatuses } from '../status'

describe('canActivate', () => {
  const ok = { effectiveDate: '2026-01-01', serviceCount: 1, outcomeCount: 1 }
  test('passes when complete', () => {
    expect(canActivate(ok).ok).toBe(true)
  })
  test('fails without effective date', () => {
    const r = canActivate({ ...ok, effectiveDate: null })
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/effective date/i)
  })
  test('fails without a service', () => {
    expect(canActivate({ ...ok, serviceCount: 0 }).ok).toBe(false)
  })
  test('fails without an outcome', () => {
    expect(canActivate({ ...ok, outcomeCount: 0 }).ok).toBe(false)
  })
})

describe('nextStatuses', () => {
  test('draft can go active', () => { expect(nextStatuses('draft')).toContain('active') })
  test('active can go under_review or expired', () => {
    expect(nextStatuses('active')).toEqual(expect.arrayContaining(['under_review', 'expired']))
  })
  test('expired is terminal', () => { expect(nextStatuses('expired')).toEqual([]) })
})
