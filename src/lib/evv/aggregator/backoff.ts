/** Exponential backoff with a hard cap, for transient transmission retries. */

export const BASE_BACKOFF_MS = 60_000 // 1 minute
export const MAX_BACKOFF_MS = 6 * 60 * 60_000 // 6 hours

export function computeBackoffMs(
  attempt: number,
  baseMs: number = BASE_BACKOFF_MS,
  maxMs: number = MAX_BACKOFF_MS
): number {
  if (attempt <= 0) return baseMs
  const raw = baseMs * 2 ** (attempt - 1)
  return Math.min(raw, maxMs)
}

export function nextAttemptAt(attempt: number, now: Date): string {
  return new Date(now.getTime() + computeBackoffMs(attempt)).toISOString()
}
