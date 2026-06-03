import { describe, it, expect } from 'vitest'
import { createStaffSchema } from '@/lib/staff-admin/schemas'

describe('createStaffSchema', () => {
  it('passes with valid input', () => {
    const result = createStaffSchema.safeParse({
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('fails with empty firstName', () => {
    const result = createStaffSchema.safeParse({
      firstName: '',
      lastName: 'Johnson',
      email: 'alex@example.com',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('First name required')
  })

  it('fails with empty lastName', () => {
    const result = createStaffSchema.safeParse({
      firstName: 'Alex',
      lastName: '',
      email: 'alex@example.com',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Last name required')
  })

  it('fails with invalid email', () => {
    const result = createStaffSchema.safeParse({
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Invalid email')
  })

  it('fails when email is missing', () => {
    const result = createStaffSchema.safeParse({
      firstName: 'Alex',
      lastName: 'Johnson',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional phone', () => {
    const result = createStaffSchema.safeParse({
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex@example.com',
      phone: '612-555-0100',
    })
    expect(result.success).toBe(true)
    expect(result.data?.phone).toBe('612-555-0100')
  })
})
