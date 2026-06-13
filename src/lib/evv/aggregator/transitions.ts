import { nextAttemptAt } from './backoff'
import type { TransmissionOutcome } from './types'

export type TransmissionStatus = 'queued' | 'sending' | 'accepted' | 'rejected' | 'failed'

export type TransmissionRow = {
  status: TransmissionStatus
  attempts: number
  max_attempts: number
}

export type TransmissionPatch = {
  status: TransmissionStatus
  attempts: number
  last_error: string | null
  external_id?: string | null
  next_attempt_at?: string
  response_payload?: unknown
}

/**
 * Pure transition: given the current row and an attempt outcome, compute the
 * next persisted state. Holds the retry/dead-letter policy in one testable
 * place so the worker stays a thin I/O shell.
 */
export function applyOutcome(
  row: TransmissionRow,
  outcome: TransmissionOutcome,
  now: Date
): TransmissionPatch {
  switch (outcome.kind) {
    case 'accepted':
      return {
        status: 'accepted',
        attempts: row.attempts + 1,
        last_error: null,
        external_id: outcome.externalId ?? null,
        response_payload: outcome.raw ?? null,
      }

    case 'rejected':
      // Permanent — bad data the aggregator will never accept. Stop, surface.
      return {
        status: 'rejected',
        attempts: row.attempts + 1,
        last_error: outcome.reason,
        response_payload: outcome.raw ?? null,
      }

    case 'retryable': {
      const attempts = row.attempts + 1
      if (attempts >= row.max_attempts) {
        return { status: 'failed', attempts, last_error: `Max retries reached: ${outcome.reason}`, response_payload: outcome.raw ?? null }
      }
      return {
        status: 'queued',
        attempts,
        last_error: outcome.reason,
        next_attempt_at: nextAttemptAt(attempts, now),
        response_payload: outcome.raw ?? null,
      }
    }

    case 'not_configured':
      // Org isn't wired to an aggregator yet — hold without consuming a retry.
      return {
        status: 'queued',
        attempts: row.attempts,
        last_error: outcome.reason,
        next_attempt_at: nextAttemptAt(1, now),
      }
  }
}
