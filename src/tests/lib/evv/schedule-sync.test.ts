import { describe, it, expect } from 'vitest'
import {
  findUnsyncedSchedules,
  scheduleToVisitInsert,
  type ScheduleRow,
  type ExistingVisit,
} from '@/lib/evv/schedule-sync'

function makeSchedule(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'sch-1',
    client_id: 'client-1',
    scheduled_date: '2026-06-12',
    start_time: '09:00:00',
    end_time: '11:00:00',
    service_type: 'IHS support',
    status: 'scheduled',
    evv_visit_id: null,
    ...overrides,
  }
}

describe('findUnsyncedSchedules', () => {
  it('returns a schedule with no matching visit', () => {
    const result = findUnsyncedSchedules([makeSchedule()], [])
    expect(result).toHaveLength(1)
  })

  it('skips schedules that already produced a visit (by link)', () => {
    const result = findUnsyncedSchedules([makeSchedule({ evv_visit_id: 'visit-9' })], [])
    expect(result).toHaveLength(0)
  })

  it('skips schedules already matched by client + date + service', () => {
    const existing: ExistingVisit[] = [
      { client_id: 'client-1', service_date: '2026-06-12', service_name: 'IHS support' },
    ]
    expect(findUnsyncedSchedules([makeSchedule()], existing)).toHaveLength(0)
  })

  it('matches service names case-insensitively', () => {
    const existing: ExistingVisit[] = [
      { client_id: 'client-1', service_date: '2026-06-12', service_name: 'ihs SUPPORT' },
    ]
    expect(findUnsyncedSchedules([makeSchedule()], existing)).toHaveLength(0)
  })

  it('ignores cancelled and no_show schedules', () => {
    const schedules = [
      makeSchedule({ id: 'a', status: 'cancelled' }),
      makeSchedule({ id: 'b', status: 'no_show' }),
    ]
    expect(findUnsyncedSchedules(schedules, [])).toHaveLength(0)
  })

  it('deduplicates identical schedules within the same batch', () => {
    const schedules = [makeSchedule({ id: 'a' }), makeSchedule({ id: 'b' })]
    expect(findUnsyncedSchedules(schedules, [])).toHaveLength(1)
  })

  it('keeps distinct services on the same day for the same client', () => {
    const schedules = [
      makeSchedule({ id: 'a', service_type: 'IHS support' }),
      makeSchedule({ id: 'b', service_type: 'Homemaker' }),
    ]
    expect(findUnsyncedSchedules(schedules, [])).toHaveLength(2)
  })
})

describe('scheduleToVisitInsert', () => {
  it('builds a scheduled EVV visit payload from a schedule', () => {
    const insert = scheduleToVisitInsert('org-1', makeSchedule())
    expect(insert).toMatchObject({
      organization_id: 'org-1',
      client_id: 'client-1',
      service_name: 'IHS support',
      service_date: '2026-06-12',
      scheduled_start: '2026-06-12T09:00:00',
      scheduled_end: '2026-06-12T11:00:00',
      status: 'scheduled',
    })
  })
})
