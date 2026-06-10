import { describe, it, expect } from 'vitest'
import { detectConflicts } from '@/lib/schedule/conflicts'
import { expandRecurrence } from '@/lib/schedule/recurring'

describe('expandRecurrence', () => {
  it('returns single date for "none" pattern', () => {
    expect(expandRecurrence('2026-06-08', 'none', 5)).toEqual(['2026-06-08'])
  })

  it('expands daily pattern correctly', () => {
    const dates = expandRecurrence('2026-06-08', 'daily', 3)
    expect(dates).toHaveLength(3)
    expect(dates[0]).toBe('2026-06-08')
    expect(dates[1]).toBe('2026-06-09')
    expect(dates[2]).toBe('2026-06-10')
  })

  it('skips weekends for weekdays pattern', () => {
    const dates = expandRecurrence('2026-06-05', 'weekdays', 3)
    // June 5 2026 is Friday → skips Sat/Sun → Mon June 8
    expect(dates).toContain('2026-06-05')
    expect(dates).toContain('2026-06-08')
    expect(dates).toContain('2026-06-09')
    expect(dates).not.toContain('2026-06-06')
    expect(dates).not.toContain('2026-06-07')
  })

  it('expands weekly pattern (same day of week)', () => {
    const dates = expandRecurrence('2026-06-08', 'weekly', 2)
    expect(dates).toHaveLength(2)
    expect(dates[0]).toBe('2026-06-08')
    expect(dates[1]).toBe('2026-06-15')
  })

  it('expands Mon/Wed/Fri pattern', () => {
    const dates = expandRecurrence('2026-06-08', 'mon_wed_fri', 4)
    expect(dates).toHaveLength(4)
    // Mon June 8, Wed June 10, Fri June 12, Mon June 15
    expect(dates[0]).toBe('2026-06-08')
    expect(dates[1]).toBe('2026-06-10')
    expect(dates[2]).toBe('2026-06-12')
    expect(dates[3]).toBe('2026-06-15')
  })

  it('expands Tue/Thu pattern', () => {
    const dates = expandRecurrence('2026-06-09', 'tue_thu', 3)
    expect(dates).toHaveLength(3)
    expect(dates).toContain('2026-06-09')
    expect(dates).toContain('2026-06-11')
  })
})

describe('detectConflicts', () => {
  const existing = [
    { id: '1', staff_name: 'Alice', scheduled_date: '2026-06-08', start_time: '09:00', end_time: '12:00' },
    { id: '2', staff_name: 'Bob', scheduled_date: '2026-06-08', start_time: '13:00', end_time: '15:00' },
  ]

  it('returns empty when no existing entries', () => {
    expect(detectConflicts('Alice', '2026-06-08', '09:00', '12:00', [])).toHaveLength(0)
  })

  it('detects overlapping times for same staff on same date', () => {
    const conflicts = detectConflicts('Alice', '2026-06-08', '10:00', '13:00', existing)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].message).toContain('Alice')
  })

  it('returns empty for different staff', () => {
    const conflicts = detectConflicts('Charlie', '2026-06-08', '10:00', '13:00', existing)
    expect(conflicts).toHaveLength(0)
  })

  it('returns empty for non-overlapping times on same day', () => {
    const conflicts = detectConflicts('Alice', '2026-06-08', '13:00', '14:00', existing)
    expect(conflicts).toHaveLength(0)
  })

  it('returns no conflicts for same staff on different day', () => {
    const conflicts = detectConflicts('Alice', '2026-06-09', '10:00', '12:00', existing)
    expect(conflicts).toHaveLength(0)
  })
})
