import { describe, test, expect } from 'vitest'
import { checkEligibility, type EligibilityInput } from '../eligibility'

const base: EligibilityInput = {
  program: 'ICS',
  waiver_type: 'CADI',
  county_of_service: 'Hennepin',
  service_start_date: '2025-01-15',
  guardianship_status: 'self',
  guardian_name: null,
  today: '2026-06-17',
}

describe('checkEligibility', () => {
  test('passes for complete valid data', () => {
    const { verdict, flags } = checkEligibility(base)
    expect(verdict).toBe('pass')
    expect(flags).toHaveLength(0)
  })

  test('fails on unknown program', () => {
    const { verdict, flags } = checkEligibility({ ...base, program: 'Wizardry' })
    expect(verdict).toBe('fail')
    expect(flags.map((f) => f.code)).toContain('invalid_program')
  })

  test('fails on missing waiver type', () => {
    const { flags } = checkEligibility({ ...base, waiver_type: '' })
    expect(flags.map((f) => f.code)).toContain('missing_waiver_type')
  })

  test('fails on future service start date', () => {
    const { flags } = checkEligibility({ ...base, service_start_date: '2099-01-01' })
    expect(flags.map((f) => f.code)).toContain('future_start_date')
  })

  test('flags guardian required but missing', () => {
    const { flags } = checkEligibility({ ...base, guardianship_status: 'full_guardian', guardian_name: null })
    expect(flags.map((f) => f.code)).toContain('missing_guardian')
  })
})
