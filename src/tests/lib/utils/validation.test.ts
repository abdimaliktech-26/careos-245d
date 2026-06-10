import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import type { SignatureRole } from '@/lib/forms/signature-validation'

const uuidSchema = z.string().uuid()
const emailSchema = z.string().email()
const nameSchema = z.string().min(2, 'Name is required').max(140)
const enumSchema = z.enum(['option_a', 'option_b', 'option_c'])

describe('UUID validation', () => {
  it('accepts valid UUID v4', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })

  it('rejects non-UUID string', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(uuidSchema.safeParse('').success).toBe(false)
  })

  it('rejects short UUID', () => {
    expect(uuidSchema.safeParse('abc-123').success).toBe(false)
  })
})

describe('Email validation pattern', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true)
  })

  it('rejects missing @', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })

  it('rejects missing domain', () => {
    expect(emailSchema.safeParse('user@').success).toBe(false)
  })

  it('rejects missing local part', () => {
    expect(emailSchema.safeParse('@example.com').success).toBe(false)
  })

  it('accepts email with subdomain', () => {
    expect(emailSchema.safeParse('user@sub.example.com').success).toBe(true)
  })
})

describe('Email or empty string pattern', () => {
  const schema = z.string().email().optional().or(z.literal(''))

  it('accepts valid email', () => {
    expect(schema.safeParse('user@example.com').success).toBe(true)
  })

  it('accepts empty string', () => {
    expect(schema.safeParse('').success).toBe(true)
  })

  it('accepts undefined', () => {
    expect(schema.safeParse(undefined).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(schema.safeParse('not-email').success).toBe(false)
  })
})

describe('Name field validation pattern', () => {
  it('accepts 2+ character name', () => {
    expect(nameSchema.safeParse('Alice Smith').success).toBe(true)
  })

  it('rejects single character', () => {
    expect(nameSchema.safeParse('A').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(nameSchema.safeParse('').success).toBe(false)
  })

  it('rejects exceeding max length', () => {
    expect(nameSchema.safeParse('x'.repeat(141)).success).toBe(false)
  })

  it('accepts 140 character name', () => {
    expect(nameSchema.safeParse('x'.repeat(140)).success).toBe(true)
  })
})

describe('Enum validation pattern', () => {
  it('accepts valid enum value', () => {
    expect(enumSchema.safeParse('option_a').success).toBe(true)
  })

  it('rejects invalid enum value', () => {
    expect(enumSchema.safeParse('invalid_option').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(enumSchema.safeParse('').success).toBe(false)
  })

  it('is case sensitive', () => {
    expect(enumSchema.safeParse('OPTION_A').success).toBe(false)
  })
})

describe('Number with constraints', () => {
  const scoreSchema = z.number().int().min(0).max(100)

  it('accepts valid score', () => {
    expect(scoreSchema.safeParse(75).success).toBe(true)
  })

  it('accepts boundary values', () => {
    expect(scoreSchema.safeParse(0).success).toBe(true)
    expect(scoreSchema.safeParse(100).success).toBe(true)
  })

  it('rejects negative values', () => {
    expect(scoreSchema.safeParse(-1).success).toBe(false)
  })

  it('rejects values above 100', () => {
    expect(scoreSchema.safeParse(101).success).toBe(false)
  })

  it('rejects float values', () => {
    expect(scoreSchema.safeParse(75.5).success).toBe(false)
  })

  it('rejects string input', () => {
    expect(scoreSchema.safeParse('75').success).toBe(false)
  })

  it('rejects null', () => {
    expect(scoreSchema.safeParse(null).success).toBe(false)
  })
})

describe('Optional nullable number', () => {
  const schema = z.number().int().min(0).max(100).optional().nullable()

  it('accepts valid number', () => {
    expect(schema.safeParse(50).success).toBe(true)
  })

  it('accepts undefined', () => {
    expect(schema.safeParse(undefined).success).toBe(true)
  })

  it('accepts null', () => {
    expect(schema.safeParse(null).success).toBe(true)
  })

  it('rejects invalid value', () => {
    expect(schema.safeParse(-1).success).toBe(false)
  })
})

describe('UUID with refinement', () => {
  const nonNullUuidSchema = z.string().uuid('Invalid UUID')

  it('provides custom error message', () => {
    const result = nonNullUuidSchema.safeParse('bad')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid UUID')
    }
  })
})

describe('Signature role validation', () => {
  const validRoles: SignatureRole[] = ['client', 'guardian', 'staff', 'case_manager', 'witness', 'supervisor']

  it('recognizes all valid signature roles', () => {
    expect(validRoles).toHaveLength(6)
  })

  it('detects client or guardian for requirement fulfillment', () => {
    const hasClient = validateRequiredSignatures([{ signer_role: 'client' }, { signer_role: 'case_manager' }])
    expect(hasClient.isValid).toBe(true)

    const hasGuardian = validateRequiredSignatures([{ signer_role: 'guardian' }, { signer_role: 'case_manager' }])
    expect(hasGuardian.isValid).toBe(true)
  })
})

describe('Zod schema composition patterns', () => {
  it('supports partial schemas for updates', () => {
    const fullSchema = z.object({ name: z.string().min(1), age: z.number().int().min(0) })
    const partialSchema = fullSchema.partial()

    expect(partialSchema.safeParse({}).success).toBe(true)
    expect(partialSchema.safeParse({ name: 'Test' }).success).toBe(true)
    expect(partialSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('supports default values', () => {
    const schema = z.object({ status: z.string().default('active') })
    expect(schema.parse({}).status).toBe('active')
    expect(schema.parse({ status: 'inactive' }).status).toBe('inactive')
  })

  it('strips unknown keys by default', () => {
    const schema = z.object({ name: z.string() })
    const result = schema.safeParse({ name: 'Test', extra: 'should be stripped' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extra' in result.data).toBe(false)
    }
  })
})
