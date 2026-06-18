import { describe, test, expect } from 'vitest'
import { applyImpersonation } from '../get-session'
import type { UserProfile } from '@/types/app'

const base: UserProfile = { id: 'u1', organizationId: 'own-org', role: 'super_admin', fullName: 'Su', email: 's@x.com', isActive: true }

describe('applyImpersonation', () => {
  test('overrides org + sets flag when active', () => {
    const out = applyImpersonation(base, { orgId: 'org-2', orgName: 'Acme', expiresAt: 'T' })
    expect(out.organizationId).toBe('org-2')
    expect(out.impersonating).toEqual({ orgId: 'org-2', orgName: 'Acme', expiresAt: 'T' })
  })
  test('unchanged when no impersonation', () => {
    const out = applyImpersonation(base, null)
    expect(out.organizationId).toBe('own-org')
    expect(out.impersonating ?? null).toBeNull()
  })
})
