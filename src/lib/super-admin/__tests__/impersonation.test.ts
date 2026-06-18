import { describe, test, expect } from 'vitest'
import { parseActiveImpersonation, type ImpersonationRow } from '../impersonation-read'

const future = new Date(Date.now() + 60000).toISOString()
const past = new Date(Date.now() - 60000).toISOString()

describe('parseActiveImpersonation', () => {
  test('returns target org for an active unexpired row', () => {
    const row: ImpersonationRow = { organization_id: 'org-2', expires_at: future, ended_at: null, organizations: { name: 'Acme' } }
    expect(parseActiveImpersonation(row)).toEqual({ orgId: 'org-2', orgName: 'Acme', expiresAt: future })
  })
  test('returns null for an expired row', () => {
    expect(parseActiveImpersonation({ organization_id: 'o', expires_at: past, ended_at: null, organizations: { name: 'X' } })).toBeNull()
  })
  test('returns null for an ended row', () => {
    expect(parseActiveImpersonation({ organization_id: 'o', expires_at: future, ended_at: past, organizations: { name: 'X' } })).toBeNull()
  })
  test('returns null for no row', () => {
    expect(parseActiveImpersonation(null)).toBeNull()
  })
  test('falls back to default name when org name missing', () => {
    expect(parseActiveImpersonation({ organization_id: 'o', expires_at: future, ended_at: null, organizations: null })?.orgName).toBe('Organization')
  })
})
