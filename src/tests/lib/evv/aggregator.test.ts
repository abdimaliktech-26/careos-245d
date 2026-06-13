import { describe, it, expect } from 'vitest'
import type { EvvComplianceVisit } from '@/lib/evv/compliance'
import { buildAggregatorPayload, resolveExternalIds, validateForTransmission } from '@/lib/evv/aggregator/mapping'
import { computeBackoffMs, MAX_BACKOFF_MS, BASE_BACKOFF_MS } from '@/lib/evv/aggregator/backoff'
import { applyOutcome } from '@/lib/evv/aggregator/transitions'

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

describe('validateForTransmission', () => {
  it('accepts a clean, completed, compliant visit', () => {
    expect(validateForTransmission(makeVisit()).ok).toBe(true)
  })

  it('blocks a non-completed visit', () => {
    const result = validateForTransmission(makeVisit({ status: 'in_progress', actualEnd: null }))
    expect(result.ok).toBe(false)
  })

  it('blocks a visit missing Cures Act elements', () => {
    const result = validateForTransmission(makeVisit({ checkInLocation: null, checkOutLocation: null }))
    expect(result.ok).toBe(false)
    expect(result.reasons.join(' ')).toMatch(/Cures Act/)
  })

  it('blocks a visit with an unresolved geofence violation', () => {
    const result = validateForTransmission(makeVisit({ checkInDistanceM: 800 }))
    expect(result.ok).toBe(false)
    expect(result.reasons.join(' ')).toMatch(/geofence/)
  })
})

describe('buildAggregatorPayload', () => {
  it('maps the six Cures Act elements and a stable idempotency key', () => {
    const payload = buildAggregatorPayload(makeVisit(), {
      providerId: 'PRV-123',
      clientExternalId: 'MA-999',
      caregiverExternalId: 'CG-7',
    })
    expect(payload).toMatchObject({
      idempotencyKey: 'visit-1',
      providerId: 'PRV-123',
      serviceType: 'IHS support',
      clientExternalId: 'MA-999',
      caregiverExternalId: 'CG-7',
      serviceDate: '2026-06-10',
      billableMinutes: 113,
    })
    expect(payload.checkIn?.timestamp).toBe('2026-06-10T14:05:00.000Z')
    expect(payload.checkOut?.lat).toBe(44.97)
  })
})

describe('resolveExternalIds', () => {
  it('resolves recipient and caregiver ids', () => {
    const result = resolveExternalIds({
      clientMedicaidNumber: 'MA-100',
      staffId: 'staff-1',
      staffCaregiverId: 'UMPI-9',
    })
    expect(result.clientExternalId).toBe('MA-100')
    expect(result.caregiverExternalId).toBe('UMPI-9')
    expect(result.missing).toHaveLength(0)
  })

  it('flags a missing recipient number', () => {
    const result = resolveExternalIds({ clientMedicaidNumber: null, staffId: null, staffCaregiverId: null })
    expect(result.missing.join(' ')).toMatch(/recipient number/)
  })

  it('requires a caregiver id only when a caregiver is assigned', () => {
    const unstaffed = resolveExternalIds({ clientMedicaidNumber: 'MA-1', staffId: null, staffCaregiverId: null })
    expect(unstaffed.missing).toHaveLength(0)

    const staffed = resolveExternalIds({ clientMedicaidNumber: 'MA-1', staffId: 'staff-1', staffCaregiverId: '  ' })
    expect(staffed.missing.join(' ')).toMatch(/caregiver/)
  })
})

describe('computeBackoffMs', () => {
  it('grows exponentially from the base', () => {
    expect(computeBackoffMs(1)).toBe(BASE_BACKOFF_MS)
    expect(computeBackoffMs(2)).toBe(BASE_BACKOFF_MS * 2)
    expect(computeBackoffMs(3)).toBe(BASE_BACKOFF_MS * 4)
  })

  it('caps at the maximum', () => {
    expect(computeBackoffMs(50)).toBe(MAX_BACKOFF_MS)
  })
})

describe('applyOutcome', () => {
  const now = new Date('2026-06-12T12:00:00.000Z')
  const row = { status: 'sending' as const, attempts: 1, max_attempts: 5 }

  it('accepts and records the external id', () => {
    const patch = applyOutcome(row, { kind: 'accepted', externalId: 'EXT-1' }, now)
    expect(patch.status).toBe('accepted')
    expect(patch.external_id).toBe('EXT-1')
    expect(patch.attempts).toBe(2)
  })

  it('permanently rejects bad data', () => {
    const patch = applyOutcome(row, { kind: 'rejected', reason: 'bad code' }, now)
    expect(patch.status).toBe('rejected')
    expect(patch.last_error).toBe('bad code')
  })

  it('re-queues a transient failure with backoff', () => {
    const patch = applyOutcome(row, { kind: 'retryable', reason: 'timeout' }, now)
    expect(patch.status).toBe('queued')
    expect(patch.attempts).toBe(2)
    expect(patch.next_attempt_at).toBeDefined()
  })

  it('dead-letters after exhausting retries', () => {
    const patch = applyOutcome({ status: 'sending', attempts: 4, max_attempts: 5 }, { kind: 'retryable', reason: 'timeout' }, now)
    expect(patch.status).toBe('failed')
    expect(patch.attempts).toBe(5)
  })

  it('holds without consuming an attempt when not configured', () => {
    const patch = applyOutcome(row, { kind: 'not_configured', reason: 'no aggregator' }, now)
    expect(patch.status).toBe('queued')
    expect(patch.attempts).toBe(1)
  })
})
