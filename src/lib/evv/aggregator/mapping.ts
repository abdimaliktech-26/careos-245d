import {
  checkCuresActElements,
  computeBillableMinutes,
  detectVisitExceptions,
  type EvvComplianceVisit,
} from '@/lib/evv/compliance'
import type { AggregatorVisitPayload, GpsStamp } from './types'

/**
 * Pre-transmission gate. A visit is only sent to the aggregator when it is a
 * completed, fully-documented, exception-free record. We never transmit a
 * non-compliant visit — that is the difference between a billing system and a
 * fraud liability.
 */
export type TransmissionEligibility = {
  ok: boolean
  reasons: string[]
}

export function validateForTransmission(visit: EvvComplianceVisit): TransmissionEligibility {
  const reasons: string[] = []

  if (visit.status !== 'completed') reasons.push(`Visit status is "${visit.status}", not completed.`)
  if (!visit.actualStart || !visit.actualEnd) reasons.push('Missing verified check-in/check-out times.')

  const cures = checkCuresActElements(visit)
  if (!cures.isComplete) reasons.push(`Missing Cures Act element(s): ${cures.missing.join(', ')}.`)

  const blocking = detectVisitExceptions(visit).filter(
    (e) => e.severity === 'critical' || e.severity === 'high'
  )
  for (const exception of blocking) reasons.push(`Unresolved exception: ${exception.type}.`)

  return { ok: reasons.length === 0, reasons }
}

/**
 * Resolves the aggregator-facing identifiers from the org's records. The
 * aggregator bills by these IDs, not our internal UUIDs — a visit without a
 * recipient ID (or a staffed visit without a caregiver ID) can't be billed and
 * must not be transmitted.
 */
export type ResolvedExternalIds = {
  clientExternalId: string | null
  caregiverExternalId: string | null
  missing: string[]
}

export function resolveExternalIds(input: {
  clientMedicaidNumber: string | null | undefined
  staffId: string | null
  staffCaregiverId: string | null | undefined
}): ResolvedExternalIds {
  const missing: string[] = []

  const clientExternalId = input.clientMedicaidNumber?.trim() || null
  if (!clientExternalId) missing.push('Client is missing a Medicaid/MA recipient number.')

  let caregiverExternalId: string | null = null
  if (input.staffId) {
    caregiverExternalId = input.staffCaregiverId?.trim() || null
    if (!caregiverExternalId) missing.push('Assigned caregiver is missing an EVV caregiver ID.')
  }

  return { clientExternalId, caregiverExternalId, missing }
}

function toGpsStamp(location: EvvComplianceVisit['checkInLocation'], timestamp: string | null): GpsStamp | null {
  if (!timestamp) return null
  return {
    timestamp,
    lat: location?.lat,
    lng: location?.lng,
    accuracy: location?.accuracy,
  }
}

/**
 * Maps an internal visit to the normalized aggregator payload.
 *
 * `clientExternalId` / `caregiverExternalId` are the IDs the aggregator knows
 * the client and caregiver by (Medicaid/MA recipient id, caregiver registry
 * id). They come from the org's mapping tables, not the internal UUIDs.
 *
 * NOTE: confirm exact field names/casing against the vendor's integration
 * packet before go-live — the *shape* is normalized here, the wire format is
 * the adapter's job.
 */
export function buildAggregatorPayload(
  visit: EvvComplianceVisit,
  opts: { providerId: string; clientExternalId: string; caregiverExternalId: string | null; serviceType?: string }
): AggregatorVisitPayload {
  return {
    // Stable per visit → the aggregator dedupes resubmissions instead of
    // creating a second billable record.
    idempotencyKey: visit.id,
    providerId: opts.providerId,
    visitId: visit.id,
    // State service-code mapping (procedure/aggregator code) when resolved;
    // falls back to the internal service name only if no mapping exists.
    serviceType: opts.serviceType ?? visit.serviceName ?? '',
    clientExternalId: opts.clientExternalId,
    caregiverExternalId: opts.caregiverExternalId,
    serviceDate: visit.serviceDate,
    checkIn: toGpsStamp(visit.checkInLocation, visit.actualStart),
    checkOut: toGpsStamp(visit.checkOutLocation, visit.actualEnd),
    serviceLocation: visit.checkInLocation ?? visit.checkOutLocation ?? null,
    billableMinutes: computeBillableMinutes(visit),
  }
}
