import { describe, test, expect } from 'vitest'
import {
  parseTimeToMinutes,
  dueTimesForDate,
  isMedicationActiveOn,
  classifyTiming,
} from '../schedule'

describe('parseTimeToMinutes', () => {
  test('parses valid HH:MM', () => {
    expect(parseTimeToMinutes('08:00')).toBe(480)
    expect(parseTimeToMinutes('20:30')).toBe(1230)
  })
  test('rejects invalid input', () => {
    expect(parseTimeToMinutes('25:00')).toBeNull()
    expect(parseTimeToMinutes('8am')).toBeNull()
    expect(parseTimeToMinutes('08:99')).toBeNull()
  })
})

describe('dueTimesForDate', () => {
  test('returns sorted due-times for each administration time', () => {
    const date = new Date('2026-06-25T00:00:00')
    const due = dueTimesForDate(date, ['20:00', '08:00'], false)
    expect(due).toHaveLength(2)
    expect(due[0].getHours()).toBe(8)
    expect(due[1].getHours()).toBe(20)
  })
  test('PRN medications produce no scheduled tasks', () => {
    const date = new Date('2026-06-25T00:00:00')
    expect(dueTimesForDate(date, ['08:00'], true)).toEqual([])
  })
  test('skips invalid times', () => {
    const date = new Date('2026-06-25T00:00:00')
    expect(dueTimesForDate(date, ['08:00', 'bad'], false)).toHaveLength(1)
  })
})

describe('isMedicationActiveOn', () => {
  const date = new Date('2026-06-25T12:00:00')
  test('active within window', () => {
    expect(isMedicationActiveOn(date, '2026-06-01', '2026-12-31')).toBe(true)
  })
  test('inactive before start', () => {
    expect(isMedicationActiveOn(date, '2026-07-01', null)).toBe(false)
  })
  test('inactive after end', () => {
    expect(isMedicationActiveOn(date, null, '2026-06-01')).toBe(false)
  })
  test('open-ended is active', () => {
    expect(isMedicationActiveOn(date, null, null)).toBe(true)
  })
})

describe('classifyTiming', () => {
  const now = new Date('2026-06-25T12:00:00')
  test('upcoming when well before due', () => {
    expect(classifyTiming(new Date('2026-06-25T13:00:00'), now)).toBe('upcoming')
  })
  test('due around the scheduled time', () => {
    expect(classifyTiming(new Date('2026-06-25T11:55:00'), now)).toBe('due')
  })
  test('late after threshold', () => {
    expect(classifyTiming(new Date('2026-06-25T11:00:00'), now)).toBe('late')
  })
  test('missed after long delay', () => {
    expect(classifyTiming(new Date('2026-06-25T09:00:00'), now)).toBe('missed')
  })
})
