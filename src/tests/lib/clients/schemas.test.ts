import { describe, it, expect } from 'vitest'
import { createClientSchema, updateClientSchema } from '@/lib/clients/schemas'

describe('createClientSchema', () => {
  it('passes with minimal valid input', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
      state: 'MN',
    })
    expect(result.success).toBe(true)
  })

  it('fails when firstName is empty', () => {
    const result = createClientSchema.safeParse({
      firstName: '',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
      state: 'MN',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('First name required')
  })

  it('fails when lastName is empty', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: '',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
      state: 'MN',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Last name required')
  })

  it('fails when intakeDate is missing', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      program: 'ICS',
      state: 'MN',
    })
    expect(result.success).toBe(false)
  })

  it('fails with invalid email', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
      state: 'MN',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Invalid email')
  })

  it('passes with empty email string', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
      state: 'MN',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('defaults state to MN', () => {
    const result = createClientSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      intakeDate: '2026-06-01',
      program: 'ICS',
    })
    expect(result.success).toBe(true)
    expect(result.data?.state).toBe('MN')
  })
})

describe('updateClientSchema', () => {
  it('passes with partial input', () => {
    const result = updateClientSchema.safeParse({ phone: '612-555-0100' })
    expect(result.success).toBe(true)
  })

  it('passes with empty object', () => {
    const result = updateClientSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})
