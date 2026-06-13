import type {
  AggregatorAdapter,
  AggregatorVisitPayload,
  ResolvedAggregatorConfig,
  TransmissionOutcome,
} from './types'

/**
 * Sandata aggregator adapter (used by several other states).
 *
 * Present to prove the transmission layer is genuinely vendor-agnostic — the
 * queue/retry/audit machinery is shared; only this file changes per vendor.
 * Endpoint + schema come from Sandata's integration packet. Returns
 * `not_configured` until wired, so nothing is ever faked.
 */
const ENDPOINT = '/api/v1/visits' // TODO: replace with the path from the Sandata packet
const TIMEOUT_MS = 15_000

export const sandataAdapter: AggregatorAdapter = {
  vendor: 'sandata',

  async transmit(
    payload: AggregatorVisitPayload,
    config: ResolvedAggregatorConfig
  ): Promise<TransmissionOutcome> {
    if (!config.enabled || !config.apiBase || !config.apiKey || !config.providerId) {
      return { kind: 'not_configured', reason: 'Sandata not configured.' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetch(`${config.apiBase.replace(/\/$/, '')}${ENDPOINT}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
          'idempotency-key': payload.idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
      let raw: unknown = null
      try { raw = await response.json() } catch { raw = null }

      if (response.ok) return { kind: 'accepted', raw }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { kind: 'rejected', reason: `HTTP ${response.status}`, raw }
      }
      return { kind: 'retryable', reason: `HTTP ${response.status}`, raw }
    } catch (error) {
      return { kind: 'retryable', reason: error instanceof Error ? error.message : 'Network error' }
    } finally {
      clearTimeout(timer)
    }
  },
}
