import { describe, test, expect } from 'vitest'
import { checkRequiredFields, type FormFieldDef } from '../required-fields'

const fields: FormFieldDef[] = [
  { field_key: 'legal_name', label: 'Legal Name', is_required: true, conditional_on: null, conditional_value: null },
  { field_key: 'dob', label: 'Date of Birth', is_required: true, conditional_on: null, conditional_value: null },
  { field_key: 'guardian_name', label: 'Guardian Name', is_required: true, conditional_on: 'guardianship_status', conditional_value: 'full_guardian' },
  { field_key: 'notes', label: 'Notes', is_required: false, conditional_on: null, conditional_value: null },
]

describe('checkRequiredFields', () => {
  test('flags missing required field', () => {
    const { checks, flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '' })
    expect(flags.map((f) => f.field)).toContain('dob')
    expect(checks.find((c) => c.key === 'required_fields')?.status).toBe('fail')
  })

  test('passes when all required present', () => {
    const { checks, flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01' })
    expect(flags).toHaveLength(0)
    expect(checks.find((c) => c.key === 'required_fields')?.status).toBe('pass')
  })

  test('ignores hidden conditional field', () => {
    const { flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01', guardianship_status: 'self' })
    expect(flags).toHaveLength(0)
  })

  test('requires conditional field when condition met', () => {
    const { flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01', guardianship_status: 'full_guardian' })
    expect(flags.map((f) => f.field)).toContain('guardian_name')
  })
})
