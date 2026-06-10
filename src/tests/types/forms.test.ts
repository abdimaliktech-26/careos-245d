import { describe, it, expect } from 'vitest'
import { isFormSchema, isFormField, FIELD_TYPES } from '@/types/forms'

describe('isFormSchema', () => {
  it('returns true for valid schema', () => {
    const schema = {
      title: 'Test Form',
      sections: [
        {
          title: 'Section 1',
          fields: [{ id: 'name', label: 'Name', type: 'text' }],
        },
      ],
    }
    expect(isFormSchema(schema)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isFormSchema(null)).toBe(false)
  })

  it('returns false for missing sections', () => {
    expect(isFormSchema({ title: 'Test' })).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isFormSchema('string')).toBe(false)
  })
})

describe('isFormField', () => {
  it('returns true for valid text field', () => {
    expect(isFormField({ id: 'name', label: 'Full Name', type: 'text' })).toBe(true)
  })

  it('returns true for all valid field types', () => {
    for (const type of FIELD_TYPES) {
      expect(isFormField({ id: 'x', label: 'X', type })).toBe(true)
    }
  })

  it('returns false for missing id', () => {
    expect(isFormField({ label: 'Full Name', type: 'text' })).toBe(false)
  })

  it('returns false for invalid type', () => {
    expect(isFormField({ id: 'x', label: 'X', type: 'unknown' })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isFormField(null)).toBe(false)
  })
})
