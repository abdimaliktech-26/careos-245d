/**
 * Vendor-agnostic EVV aggregator transmission contracts.
 *
 * A state aggregator (HHAeXchange in Minnesota's open model, Sandata, etc.)
 * receives verified visits and returns an accept/reject. Every adapter speaks
 * this single interface so the queue, audit trail, and reconciliation logic
 * never depend on a specific vendor.
 */

export type AggregatorVendor = 'none' | 'hhaexchange' | 'sandata'

/** The six 21st Century Cures Act elements, normalized for any aggregator. */
export type AggregatorVisitPayload = {
  idempotencyKey: string
  providerId: string
  visitId: string
  serviceType: string
  clientExternalId: string
  caregiverExternalId: string | null
  serviceDate: string
  checkIn: GpsStamp | null
  checkOut: GpsStamp | null
  serviceLocation: { lat?: number; lng?: number; label?: string } | null
  billableMinutes: number
}

export type GpsStamp = {
  timestamp: string
  lat?: number
  lng?: number
  accuracy?: number
}

/**
 * The result of one transmission attempt. The `kind` drives the queue:
 *  - accepted        → done
 *  - rejected        → permanent failure (bad data); a human must fix the visit
 *  - retryable       → transient (network/5xx/timeout); back off and retry
 *  - not_configured  → org has no enabled aggregator; hold, don't burn attempts
 */
export type TransmissionOutcome =
  | { kind: 'accepted'; externalId?: string; raw?: unknown }
  | { kind: 'rejected'; reason: string; raw?: unknown }
  | { kind: 'retryable'; reason: string; raw?: unknown }
  | { kind: 'not_configured'; reason: string }

export type ResolvedAggregatorConfig = {
  vendor: AggregatorVendor
  providerId: string
  apiBase: string
  /** Resolved at runtime from the secret store; NEVER persisted in the DB. */
  apiKey: string | null
  enabled: boolean
}

export interface AggregatorAdapter {
  readonly vendor: AggregatorVendor
  transmit(
    payload: AggregatorVisitPayload,
    config: ResolvedAggregatorConfig
  ): Promise<TransmissionOutcome>
}
