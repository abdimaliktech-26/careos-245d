import { describe, test, expect } from 'vitest'
import { evaluateStaffGaps, type StaffProfileLite, type TrainingLite } from '../staff-risk'

const NOW = new Date('2026-06-22T12:00:00Z')

const CLEAR_PROFILE: StaffProfileLite = {
  id: 's1',
  full_name: 'Sam Staff',
  title: 'Direct Support',
  role: 'staff',
  background_study_status: 'clear',
  background_study_expires: '2027-01-01',
}

const CURRENT_TRAININGS: TrainingLite[] = [
  { training_name: 'CPR', status: 'current', expiration_date: '2027-01-01' },
  { training_name: 'First Aid', status: 'current', expiration_date: '2027-01-01' },
]

describe('evaluateStaffGaps', () => {
  test('compliant staff has no gaps', () => {
    expect(evaluateStaffGaps(CLEAR_PROFILE, CURRENT_TRAININGS, NOW)).toEqual([])
  })

  test('flags uncleared background study as high risk', () => {
    const profile = { ...CLEAR_PROFILE, background_study_status: 'pending' }
    const gaps = evaluateStaffGaps(profile, CURRENT_TRAININGS, NOW)
    expect(gaps.find((g) => g.code === 'background_study')?.risk).toBe('high')
  })

  test('flags expired background study', () => {
    const profile = { ...CLEAR_PROFILE, background_study_expires: '2025-01-01' }
    const gaps = evaluateStaffGaps(profile, CURRENT_TRAININGS, NOW)
    expect(gaps.map((g) => g.code)).toContain('background_study_expired')
  })

  test('flags missing CPR and First Aid', () => {
    const gaps = evaluateStaffGaps(CLEAR_PROFILE, [], NOW)
    expect(gaps.map((g) => g.code)).toContain('missing_cpr')
    expect(gaps.map((g) => g.code)).toContain('missing_first_aid')
  })

  test('flags expired certification by date', () => {
    const trainings: TrainingLite[] = [
      { training_name: 'CPR', status: 'current', expiration_date: '2025-01-01' },
      { training_name: 'First Aid', status: 'current', expiration_date: '2027-01-01' },
    ]
    const gaps = evaluateStaffGaps(CLEAR_PROFILE, trainings, NOW)
    expect(gaps.map((g) => g.code)).toContain('expired_cpr')
  })

  test('flags incomplete or expired general trainings', () => {
    const trainings: TrainingLite[] = [
      ...CURRENT_TRAININGS,
      { training_name: '245D Orientation', status: 'not_completed', expiration_date: null },
    ]
    const gaps = evaluateStaffGaps(CLEAR_PROFILE, trainings, NOW)
    expect(gaps.map((g) => g.code)).toContain('incomplete_training')
  })
})
