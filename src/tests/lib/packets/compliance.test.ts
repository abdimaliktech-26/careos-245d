import { describe, it, expect } from 'vitest'
import { getPacketCompliance, complianceBadgeClass } from '@/lib/packets/compliance'

describe('getPacketCompliance', () => {
  it('returns overdue when past due date and not completed', () => {
    const past = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    const result = getPacketCompliance(past, 'pending')
    expect(result.level).toBe('overdue')
    expect(result.isAlert).toBe(true)
  })

  it('returns complete when status is completed regardless of date', () => {
    const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const result = getPacketCompliance(past, 'completed')
    expect(result.level).toBe('complete')
    expect(result.isAlert).toBe(false)
  })

  it('returns due_today for today (fixed date)', () => {
    const fixedNow = new Date('2026-06-09T12:00:00')
    const result = getPacketCompliance('2026-06-09', 'pending', fixedNow)
    expect(result.level).toBe('due_today')
    expect(result.isAlert).toBe(true)
  })

  it('returns due_tomorrow when due date is tomorrow (fixed date)', () => {
    const fixedNow = new Date('2026-06-09T12:00:00')
    const result = getPacketCompliance('2026-06-10', 'pending', fixedNow)
    expect(result.level).toBe('due_tomorrow')
  })

  it('returns warning for due date within 14 days (fixed date)', () => {
    const fixedNow = new Date('2026-06-09T12:00:00')
    const result = getPacketCompliance('2026-06-19', 'pending', fixedNow)
    expect(result.level).toBe('warning')
  })

  it('returns none for future due dates beyond 14 days', () => {
    const farFuture = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const result = getPacketCompliance(farFuture, 'pending')
    expect(result.level).toBe('none')
    expect(result.isAlert).toBe(false)
  })

  it('handles null due_date gracefully', () => {
    const result = getPacketCompliance(null, 'pending')
    expect(result.level).toBe('none')
  })

  it('returns overdue label with day count for past due', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    const result = getPacketCompliance(twoDaysAgo, 'pending')
    expect(result.label).toContain('overdue')
  })
})

describe('complianceBadgeClass', () => {
  it('returns correct class strings for known levels', () => {
    expect(complianceBadgeClass('overdue')).toContain('red')
    expect(complianceBadgeClass('due_today')).toContain('orange')
    expect(complianceBadgeClass('due_tomorrow')).toContain('orange')
    expect(complianceBadgeClass('warning')).toContain('amber')
    expect(complianceBadgeClass('complete')).toContain('green')
    expect(complianceBadgeClass('none')).toContain('gray')
  })
})
