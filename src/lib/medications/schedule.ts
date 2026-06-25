/**
 * Pure helpers for turning a medication's administration times into concrete
 * medication-pass task due-times for a given day. No I/O — unit-testable.
 */

/** A single "HH:MM" 24h time string -> minutes since midnight, or null if invalid. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * Build the list of due-at Date objects for a medication on a given local date.
 * `administrationTimes` are "HH:MM" strings. PRN meds produce no scheduled tasks.
 */
export function dueTimesForDate(
  date: Date,
  administrationTimes: string[],
  isPrn: boolean
): Date[] {
  if (isPrn) return []
  const out: Date[] = []
  for (const t of administrationTimes) {
    const mins = parseTimeToMinutes(t)
    if (mins === null) continue
    const due = new Date(date)
    due.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    out.push(due)
  }
  return out.sort((a, b) => a.getTime() - b.getTime())
}

/** Whether a medication is active on a given date based on start/end dates. */
export function isMedicationActiveOn(
  date: Date,
  startDate: string | null,
  endDate: string | null
): boolean {
  const day = date.toISOString().slice(0, 10)
  if (startDate && day < startDate) return false
  if (endDate && day > endDate) return false
  return true
}

/** A task is "late" once this many minutes pass its due time without action. */
export const LATE_THRESHOLD_MINUTES = 60

/** A task is "missed" once this many minutes pass its due time without action. */
export const MISSED_THRESHOLD_MINUTES = 120

export type TaskTiming = 'upcoming' | 'due' | 'late' | 'missed'

/** Classify a pending task's timing relative to now. */
export function classifyTiming(dueAt: Date, now: Date): TaskTiming {
  const diffMin = (now.getTime() - dueAt.getTime()) / 60000
  if (diffMin < -15) return 'upcoming'
  if (diffMin < LATE_THRESHOLD_MINUTES) return 'due'
  if (diffMin < MISSED_THRESHOLD_MINUTES) return 'late'
  return 'missed'
}
