import { describe, test, expect } from 'vitest'
import { validateEvvVisit } from '../validate'
import type { EvvComplianceVisit } from '@/lib/evv/compliance'

function makeVisit(overrides: Partial<EvvComplianceVisit> = {}): EvvComplianceVisit {
  return {
    id: 'v1', clientId: 'c1', staffId: 's1', serviceName: 'Personal Care',
    serviceDate: '2026-06-10', scheduledStart: '2026-06-10T09:00:00Z',
    scheduledEnd: '2026-06-10T10:00:00Z', actualStart: '2026-06-10T09:00:00Z',
    actualEnd: '2026-06-10T10:00:00Z', status: 'completed',
    checkInLocation: { lat: 44.98, lng: -93.26 }, checkOutLocation: { lat: 44.98, lng: -93.26 },
    checkInDistanceM: 10, checkOutDistanceM: 12, progressNote: 'Note', reviewStatus: 'approved',
    billingStatus: null, billableMinutes: 60, resolvedAt: null,
    ...overrides,
  }
}

describe('validateEvvVisit', () => {
  test('clean completed visit passes', () => {
    const { verdict, flags } = validateEvvVisit(makeVisit())
    expect(verdict).toBe('pass')
    expect(flags).toHaveLength(0)
  })

  test('missing service times fails Cures-Act check', () => {
    const { checks } = validateEvvVisit(makeVisit({ actualStart: null, actualEnd: null }))
    expect(checks.find((c) => c.key === 'cures_act')?.status).toBe('fail')
  })

  test('exceptions become flags', () => {
    // No progress note + no check-out triggers exceptions in the engine.
    const { flags } = validateEvvVisit(makeVisit({ progressNote: null, actualEnd: null, checkOutLocation: null }))
    expect(flags.length).toBeGreaterThan(0)
  })
})
