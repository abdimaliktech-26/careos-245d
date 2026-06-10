import { describe, it, expect } from 'vitest'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import type { SignatureRole } from '@/lib/forms/signature-validation'

describe('validateRequiredSignatures', () => {
  it('returns isValid=true when client and case_manager are present', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'client' },
      { signer_role: 'case_manager' },
    ])
    expect(result.isValid).toBe(true)
    expect(result.hasClientOrGuardian).toBe(true)
    expect(result.hasCaseManager).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.alert).toBeNull()
  })

  it('returns isValid=true when guardian and case_manager are present', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'guardian' },
      { signer_role: 'case_manager' },
    ])
    expect(result.isValid).toBe(true)
    expect(result.hasClientOrGuardian).toBe(true)
    expect(result.hasCaseManager).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.alert).toBeNull()
  })

  it('returns isValid=true with all roles present', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'client' },
      { signer_role: 'guardian' },
      { signer_role: 'staff' },
      { signer_role: 'witness' },
      { signer_role: 'supervisor' },
      { signer_role: 'case_manager' },
    ])
    expect(result.isValid).toBe(true)
  })

  it('reports missing client/guardian when only case_manager is present', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'case_manager' },
    ])
    expect(result.isValid).toBe(false)
    expect(result.hasClientOrGuardian).toBe(false)
    expect(result.hasCaseManager).toBe(true)
    expect(result.missing).toContain('client/guardian signature')
    expect(result.alert).toBe('Missing client/guardian signature.')
  })

  it('reports missing case_manager when only client is present', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'client' },
    ])
    expect(result.isValid).toBe(false)
    expect(result.hasClientOrGuardian).toBe(true)
    expect(result.hasCaseManager).toBe(false)
    expect(result.missing).toContain('case manager signature')
    expect(result.alert).toBe('Missing case manager signature.')
  })

  it('reports both missing when no signatures provided', () => {
    const result = validateRequiredSignatures([])
    expect(result.isValid).toBe(false)
    expect(result.hasClientOrGuardian).toBe(false)
    expect(result.hasCaseManager).toBe(false)
    expect(result.missing).toHaveLength(2)
    expect(result.missing).toContain('client/guardian signature')
    expect(result.missing).toContain('case manager signature')
    expect(result.alert).toBe('Missing client/guardian signature and case manager signature.')
  })

  it('deduplicates when multiple signatures share the same role', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'client' },
      { signer_role: 'client' },
      { signer_role: 'case_manager' },
    ])
    expect(result.isValid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('handles guardian substituting for client', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'guardian' },
      { signer_role: 'case_manager' },
      { signer_role: 'witness' },
    ])
    expect(result.isValid).toBe(true)
    expect(result.hasClientOrGuardian).toBe(true)
  })

  it('treats unknown roles as irrelevant without affecting validation', () => {
    const result = validateRequiredSignatures([
      { signer_role: 'some_unknown_role' as SignatureRole },
    ])
    expect(result.isValid).toBe(false)
    expect(result.hasClientOrGuardian).toBe(false)
    expect(result.hasCaseManager).toBe(false)
  })

  it('handles null/undefined signer_role gracefully', () => {
    const result = validateRequiredSignatures([
      { signer_role: null as unknown as string },
    ])
    expect(result.isValid).toBe(false)
    expect(result.hasClientOrGuardian).toBe(false)
  })
})
