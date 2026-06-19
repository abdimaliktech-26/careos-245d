import { describe, test, expect } from 'vitest'
import { detectVisitExceptions, type EvvComplianceVisit } from '@/lib/evv/compliance'
import { ruleParamsFor } from '../to-rule-params'
import { getStateProfile } from '../registry'

function visit(overrides: Partial<EvvComplianceVisit> = {}): EvvComplianceVisit {
  return {
    id: 'v1', clientId: 'c1', staffId: 's1', serviceName: 'Personal Care',
    serviceDate: '2026-06-10', scheduledStart: '2026-06-10T09:00:00Z', scheduledEnd: '2026-06-10T10:00:00Z',
    actualStart: '2026-06-10T09:00:00Z', actualEnd: '2026-06-10T10:00:00Z', status: 'completed',
    checkInLocation: { lat: 1, lng: 1 }, checkOutLocation: { lat: 1, lng: 1 },
    checkInDistanceM: 120, checkOutDistanceM: 120, progressNote: 'note', reviewStatus: 'approved',
    billingStatus: null, billableMinutes: 60, resolvedAt: null, ...overrides,
  }
}

describe('state-driven geofence', () => {
  test('120m distance: MN (100m) flags geofence, AZ (150m) does not', () => {
    const mn = detectVisitExceptions(visit(), { params: ruleParamsFor(getStateProfile('MN')!) })
    const az = detectVisitExceptions(visit(), { params: ruleParamsFor(getStateProfile('AZ')!) })
    expect(mn.some((e) => e.type === 'geofence_violation')).toBe(true)
    expect(az.some((e) => e.type === 'geofence_violation')).toBe(false)
  })
  test('default (no params) preserves MN behavior', () => {
    expect(detectVisitExceptions(visit()).some((e) => e.type === 'geofence_violation')).toBe(true)
  })
})
