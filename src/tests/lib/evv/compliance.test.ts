import { describe, it, expect } from 'vitest'
import {
  checkCuresActElements,
  detectVisitExceptions,
  buildComplianceSummary,
  deriveWorkflowStage,
  computeBillableMinutes,
  isMissedVisit,
  CURES_ACT_ELEMENTS,
  LATE_CHECK_IN_GRACE_MINUTES,
  WORKFLOW_STAGES,
  type EvvComplianceVisit,
} from '@/lib/evv/compliance'

function makeVisit(overrides: Partial<EvvComplianceVisit> = {}): EvvComplianceVisit {
  return {
    id: 'visit-1',
    clientId: 'client-1',
    staffId: 'staff-1',
    serviceName: 'IHS support',
    serviceDate: '2026-06-10',
    scheduledStart: '2026-06-10T14:00:00.000Z',
    scheduledEnd: '2026-06-10T16:00:00.000Z',
    actualStart: '2026-06-10T14:05:00.000Z',
    actualEnd: '2026-06-10T15:58:00.000Z',
    status: 'completed',
    checkInLocation: { source: 'gps', lat: 44.97, lng: -93.27, accuracy: 12 },
    checkOutLocation: { source: 'gps', lat: 44.97, lng: -93.27, accuracy: 15 },
    checkInDistanceM: 20,
    checkOutDistanceM: 25,
    progressNote: 'Provided IHS support per plan.',
    reviewStatus: 'approved',
    billingStatus: 'approved',
    billableMinutes: 113,
    resolvedAt: null,
    ...overrides,
  }
}

describe('checkCuresActElements', () => {
  it('reports all 6 elements captured for a fully documented visit', () => {
    const result = checkCuresActElements(makeVisit())
    expect(result.captured).toHaveLength(CURES_ACT_ELEMENTS.length)
    expect(result.missing).toHaveLength(0)
    expect(result.isComplete).toBe(true)
  })

  it('flags missing staff, times, and location', () => {
    const result = checkCuresActElements(
      makeVisit({
        staffId: null,
        actualStart: null,
        actualEnd: null,
        checkInLocation: null,
        checkOutLocation: null,
      })
    )
    expect(result.isComplete).toBe(false)
    expect(result.missing).toContain('individual_providing')
    expect(result.missing).toContain('service_times')
    expect(result.missing).toContain('service_location')
  })

  it('accepts check-out location alone as the location element', () => {
    const result = checkCuresActElements(makeVisit({ checkInLocation: null }))
    expect(result.missing).not.toContain('service_location')
  })

  it('flags missing service name', () => {
    const result = checkCuresActElements(makeVisit({ serviceName: null }))
    expect(result.missing).toContain('service_type')
  })
})

describe('detectVisitExceptions', () => {
  it('returns no exceptions for a clean completed visit', () => {
    expect(detectVisitExceptions(makeVisit())).toHaveLength(0)
  })

  it('detects late check-in beyond the grace period', () => {
    const lateStart = new Date(
      new Date('2026-06-10T14:00:00.000Z').getTime() +
        (LATE_CHECK_IN_GRACE_MINUTES + 10) * 60000
    ).toISOString()
    const exceptions = detectVisitExceptions(makeVisit({ actualStart: lateStart }))
    expect(exceptions.map((e) => e.type)).toContain('late_check_in')
  })

  it('detects early check-out beyond the grace period', () => {
    const exceptions = detectVisitExceptions(makeVisit({ actualEnd: '2026-06-10T15:00:00.000Z' }))
    expect(exceptions.map((e) => e.type)).toContain('early_check_out')
  })

  it('detects a missing check-out on an in-progress visit from a past day', () => {
    const exceptions = detectVisitExceptions(
      makeVisit({ status: 'in_progress', actualEnd: null }),
      { now: new Date('2026-06-12T12:00:00.000Z') }
    )
    expect(exceptions.map((e) => e.type)).toContain('missing_check_out')
  })

  it('does not flag missing check-out for an in-progress visit today', () => {
    const exceptions = detectVisitExceptions(
      makeVisit({ status: 'in_progress', actualEnd: null, serviceDate: '2026-06-12' }),
      { now: new Date('2026-06-12T15:00:00.000Z') }
    )
    expect(exceptions.map((e) => e.type)).not.toContain('missing_check_out')
  })

  it('detects geofence violations from stored check-in distance', () => {
    const exceptions = detectVisitExceptions(makeVisit({ checkInDistanceM: 750 }))
    expect(exceptions.map((e) => e.type)).toContain('geofence_violation')
  })

  it('detects incomplete documentation on completed visits', () => {
    const exceptions = detectVisitExceptions(
      makeVisit({ checkInLocation: null, checkOutLocation: null })
    )
    expect(exceptions.map((e) => e.type)).toContain('incomplete_documentation')
  })

  it('detects a missing progress note on completed visits', () => {
    const exceptions = detectVisitExceptions(makeVisit({ progressNote: null }))
    expect(exceptions.map((e) => e.type)).toContain('missing_progress_note')
  })

  it('skips exceptions already resolved', () => {
    const exceptions = detectVisitExceptions(
      makeVisit({ checkInDistanceM: 900, resolvedAt: '2026-06-11T10:00:00.000Z' })
    )
    expect(exceptions).toHaveLength(0)
  })
})

describe('isMissedVisit', () => {
  const now = new Date('2026-06-12T12:00:00.000Z')

  it('flags a scheduled visit whose window elapsed with no check-in', () => {
    const visit = makeVisit({ status: 'scheduled', actualStart: null, actualEnd: null })
    expect(isMissedVisit(visit, now)).toBe(true)
  })

  it('does not flag a scheduled visit whose window has not ended', () => {
    const visit = makeVisit({
      status: 'scheduled',
      serviceDate: '2026-06-12',
      scheduledStart: '2026-06-12T15:00:00.000Z',
      scheduledEnd: '2026-06-12T17:00:00.000Z',
      actualStart: null,
      actualEnd: null,
    })
    expect(isMissedVisit(visit, now)).toBe(false)
  })

  it('does not flag a visit that was checked in', () => {
    expect(isMissedVisit(makeVisit({ status: 'scheduled' }), now)).toBe(false)
  })

  it('treats a persisted missed status as missed', () => {
    expect(isMissedVisit(makeVisit({ status: 'missed', actualStart: null }), now)).toBe(true)
  })

  it('surfaces a missed_visit exception', () => {
    const exceptions = detectVisitExceptions(
      makeVisit({ status: 'scheduled', actualStart: null, actualEnd: null }),
      { now }
    )
    expect(exceptions.map((e) => e.type)).toContain('missed_visit')
  })

  it('counts derived missed visits in the dashboard summary', () => {
    const visits = [makeVisit({ id: 'm', status: 'scheduled', actualStart: null, actualEnd: null })]
    const summary = buildComplianceSummary(visits, { now })
    expect(summary.missedCount).toBe(1)
    expect(summary.scheduledCount).toBe(0)
  })
})

describe('deriveWorkflowStage', () => {
  it('walks every stage of the EVV pipeline', () => {
    expect(deriveWorkflowStage(makeVisit({ actualStart: null, actualEnd: null, status: 'scheduled' })).key).toBe('clock_in')
    expect(deriveWorkflowStage(makeVisit({ actualEnd: null, status: 'in_progress' })).key).toBe('service_delivery')
    expect(deriveWorkflowStage(makeVisit({ progressNote: null, reviewStatus: 'pending', billingStatus: 'not_ready' })).key).toBe('progress_note')
    expect(deriveWorkflowStage(makeVisit({ reviewStatus: 'pending', billingStatus: 'not_ready' })).key).toBe('supervisor_review')
    expect(
      deriveWorkflowStage(
        makeVisit({ billingStatus: 'not_ready', checkInLocation: null, checkOutLocation: null })
      ).key
    ).toBe('evv_verification')
    expect(deriveWorkflowStage(makeVisit({ billingStatus: 'not_ready' })).key).toBe('billing_approval')
    expect(deriveWorkflowStage(makeVisit()).key).toBe('compliance_tracking')
  })

  it('exposes the ordered stage list', () => {
    expect(WORKFLOW_STAGES.map((s) => s.key)).toEqual([
      'clock_in',
      'service_delivery',
      'progress_note',
      'supervisor_review',
      'evv_verification',
      'billing_approval',
      'compliance_tracking',
    ])
  })
})

describe('computeBillableMinutes', () => {
  it('prefers the stored billable minutes', () => {
    expect(computeBillableMinutes(makeVisit({ billableMinutes: 90 }))).toBe(90)
  })

  it('falls back to actual duration', () => {
    expect(computeBillableMinutes(makeVisit({ billableMinutes: null }))).toBe(113)
  })

  it('returns 0 without actual times', () => {
    expect(computeBillableMinutes(makeVisit({ billableMinutes: null, actualEnd: null }))).toBe(0)
  })
})

describe('buildComplianceSummary', () => {
  it('detects overlapping visits for the same staff member', () => {
    const visits = [
      makeVisit({ id: 'a' }),
      makeVisit({
        id: 'b',
        clientId: 'client-2',
        actualStart: '2026-06-10T15:00:00.000Z',
        actualEnd: '2026-06-10T17:00:00.000Z',
        scheduledStart: '2026-06-10T15:00:00.000Z',
        scheduledEnd: '2026-06-10T17:00:00.000Z',
      }),
    ]
    const summary = buildComplianceSummary(visits)
    expect(summary.exceptions.map((e) => e.type)).toContain('overlapping_visits')
  })

  it('detects impossible travel between consecutive visits', () => {
    const visits = [
      makeVisit({ id: 'a', actualEnd: '2026-06-10T15:00:00.000Z' }),
      makeVisit({
        id: 'b',
        clientId: 'client-2',
        actualStart: '2026-06-10T15:05:00.000Z',
        actualEnd: '2026-06-10T17:00:00.000Z',
        scheduledStart: '2026-06-10T15:05:00.000Z',
        scheduledEnd: '2026-06-10T17:00:00.000Z',
        checkInLocation: { source: 'gps', lat: 41.88, lng: -87.63, accuracy: 10 },
      }),
    ]
    const summary = buildComplianceSummary(visits)
    expect(summary.exceptions.map((e) => e.type)).toContain('impossible_travel')
  })

  it('computes dashboard metrics', () => {
    const lateStart = new Date(
      new Date('2026-06-10T14:00:00.000Z').getTime() +
        (LATE_CHECK_IN_GRACE_MINUTES + 5) * 60000
    ).toISOString()
    const visits = [
      makeVisit({ id: 'a' }),
      // Still genuinely scheduled — window is later today, not yet elapsed.
      makeVisit({
        id: 'b',
        status: 'scheduled',
        serviceDate: '2026-06-12',
        scheduledStart: '2026-06-12T15:00:00.000Z',
        scheduledEnd: '2026-06-12T17:00:00.000Z',
        actualStart: null,
        actualEnd: null,
      }),
      makeVisit({ id: 'c', status: 'in_progress', actualEnd: null, serviceDate: '2026-06-12' }),
      makeVisit({ id: 'd', status: 'missed', actualStart: null, actualEnd: null }),
      makeVisit({ id: 'e', actualStart: lateStart }),
      makeVisit({ id: 'f', checkInDistanceM: 500 }),
    ]
    const summary = buildComplianceSummary(visits, { now: new Date('2026-06-12T12:00:00.000Z') })
    expect(summary.scheduledCount).toBe(1)
    expect(summary.activeCount).toBe(1)
    expect(summary.completedCount).toBe(3)
    expect(summary.missedCount).toBe(1)
    expect(summary.lateCheckInCount).toBe(1)
    expect(summary.gpsExceptionCount).toBe(1)
    expect(summary.billableMinutes).toBe(113 * 3)
  })

  it('computes the compliance rate over completed visits', () => {
    const visits = [
      makeVisit({ id: 'a' }),
      makeVisit({ id: 'b', checkInLocation: null, checkOutLocation: null }),
      makeVisit({ id: 'c', status: 'scheduled', actualStart: null, actualEnd: null }),
    ]
    const summary = buildComplianceSummary(visits)
    expect(summary.completedCount).toBe(2)
    expect(summary.verifiedCount).toBe(1)
    expect(summary.complianceRate).toBe(50)
  })

  it('returns 100 compliance for an empty visit list', () => {
    const summary = buildComplianceSummary([])
    expect(summary.complianceRate).toBe(100)
    expect(summary.exceptions).toHaveLength(0)
  })

  it('aggregates element coverage across completed visits', () => {
    const visits = [makeVisit({ id: 'a' }), makeVisit({ id: 'b', staffId: null })]
    const summary = buildComplianceSummary(visits)
    expect(summary.elementCoverage.individual_providing.captured).toBe(1)
    expect(summary.elementCoverage.individual_providing.total).toBe(2)
    expect(summary.elementCoverage.date_of_service.captured).toBe(2)
  })
})
