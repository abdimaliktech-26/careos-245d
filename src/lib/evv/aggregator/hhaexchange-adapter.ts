import type {
  AggregatorAdapter,
  AggregatorVisitPayload,
  ResolvedAggregatorConfig,
  TransmissionOutcome,
} from './types'

/**
 * HHAeXchange aggregator adapter (Minnesota open model).
 *
 * ⚠️ INTEGRATION CONTRACT REQUIRED ⚠️
 * The exact endpoint paths, auth scheme, request schema, and response codes are
 * defined in HHAeXchange's provider integration packet, issued only after a
 * signed agreement + sandbox provisioning. The structure below is the standard
 * REST shape; replace `ENDPOINT`, the request body mapping, and the response
 * parsing with the values from that packet. Everything else (queue, retries,
 * audit, idempotency) is production-ready and does not change.
 *
 * Until `enabled` + credentials are present, this returns `not_configured`
 * instead of fabricating a success — visits stay safely queued.
 */
const ENDPOINT = '/api/v1/visits' // TODO: replace with the path from the HHAeXchange packet

const TIMEOUT_MS = 15_000

export const hhaexchangeAdapter: AggregatorAdapter = {
  vendor: 'hhaexchange',

  async transmit(
    payload: AggregatorVisitPayload,
    config: ResolvedAggregatorConfig
  ): Promise<TransmissionOutcome> {
    if (!config.enabled || !config.apiBase || !config.apiKey || !config.providerId) {
      return { kind: 'not_configured', reason: 'HHAeXchange not configured (api base, credentials, or provider id missing).' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(`${config.apiBase.replace(/\/$/, '')}${ENDPOINT}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          // TODO: confirm auth scheme (Bearer vs api-key header) from the packet.
          authorization: `Bearer ${config.apiKey}`,
          'idempotency-key': payload.idempotencyKey,
        },
        body: JSON.stringify(toHhaExchangeBody(payload)),
      })

      const raw = await safeJson(response)

      if (response.ok) {
        const externalId = extractExternalId(raw)
        return { kind: 'accepted', externalId, raw }
      }

      // 4xx (except 408/429) = the aggregator rejected the data → permanent.
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return { kind: 'rejected', reason: `HTTP ${response.status}: ${describe(raw)}`, raw }
      }

      // 429 / 5xx / 408 = transient → retry with backoff.
      return { kind: 'retryable', reason: `HTTP ${response.status}: ${describe(raw)}`, raw }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Network error'
      return { kind: 'retryable', reason }
    } finally {
      clearTimeout(timer)
    }
  },
}

/**
 * Maps the normalized payload to the HHAeXchange wire body.
 * TODO: align field names/casing with the integration packet before go-live.
 */
function toHhaExchangeBody(p: AggregatorVisitPayload): Record<string, unknown> {
  return {
    ProviderId: p.providerId,
    ExternalVisitId: p.visitId,
    ServiceCode: p.serviceType,
    PatientId: p.clientExternalId,
    CaregiverId: p.caregiverExternalId,
    VisitDate: p.serviceDate,
    TimeIn: p.checkIn?.timestamp ?? null,
    TimeOut: p.checkOut?.timestamp ?? null,
    ClockInLatitude: p.checkIn?.lat ?? null,
    ClockInLongitude: p.checkIn?.lng ?? null,
    ClockOutLatitude: p.checkOut?.lat ?? null,
    ClockOutLongitude: p.checkOut?.lng ?? null,
    BilledMinutes: p.billableMinutes,
  }
}

function extractExternalId(raw: unknown): string | undefined {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const id = obj.VisitId ?? obj.visitId ?? obj.id ?? obj.ConfirmationId
    if (id != null) return String(id)
  }
  return undefined
}

function describe(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return String(obj.Message ?? obj.error ?? obj.message ?? JSON.stringify(obj).slice(0, 300))
  }
  return typeof raw === 'string' ? raw.slice(0, 300) : 'no response body'
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
