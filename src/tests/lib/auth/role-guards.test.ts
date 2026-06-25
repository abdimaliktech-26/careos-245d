import { describe, it, expect } from 'vitest'
import {
  isStaff,
  isAdmin,
  isSuperAdmin,
  isExternalSigner,
  getRoleRedirectPath,
  ROLES,
} from '@/lib/auth/role-guards'
import type { Role } from '@/types/app'

describe('ROLES constant', () => {
  it('has all roles', () => {
    expect(ROLES.SUPER_ADMIN).toBe('super_admin')
    expect(ROLES.ORG_ADMIN).toBe('org_admin')
    expect(ROLES.PROGRAM_MANAGER).toBe('program_manager')
    expect(ROLES.STAFF).toBe('staff')
    expect(ROLES.EXTERNAL_SIGNER).toBe('external_signer')
    expect(ROLES.PHARMACY_ADMIN).toBe('pharmacy_admin')
    expect(ROLES.PHARMACY_STAFF).toBe('pharmacy_staff')
  })
  it('has exactly seven roles', () => {
    expect(Object.keys(ROLES)).toHaveLength(7)
  })
  it('values match the Role union type', () => {
    const roles: Role[] = ['super_admin', 'org_admin', 'program_manager', 'staff', 'external_signer', 'pharmacy_admin', 'pharmacy_staff']
    expect(Object.values(ROLES)).toEqual(roles)
  })
})

describe('isStaff', () => {
  it('returns true for staff role', () => {
    expect(isStaff('staff')).toBe(true)
  })
  it('returns false for non-staff roles', () => {
    expect(isStaff('org_admin')).toBe(false)
    expect(isStaff('super_admin')).toBe(false)
    expect(isStaff('program_manager')).toBe(false)
    expect(isStaff('external_signer')).toBe(false)
  })
  it('returns false for unknown role', () => {
    expect(isStaff('unknown')).toBe(false)
  })
  it('narrows type correctly when true', () => {
    const role: string = 'staff'
    if (isStaff(role)) {
      const narrowed: 'staff' = role
      expect(narrowed).toBe('staff')
    }
  })
})

describe('isAdmin', () => {
  it('returns true for org_admin role', () => {
    expect(isAdmin('org_admin')).toBe(true)
  })
  it('returns false for non-admin roles', () => {
    expect(isAdmin('staff')).toBe(false)
    expect(isAdmin('super_admin')).toBe(false)
    expect(isAdmin('program_manager')).toBe(false)
    expect(isAdmin('external_signer')).toBe(false)
  })
  it('returns false for unknown role', () => {
    expect(isAdmin('unknown')).toBe(false)
  })
  it('narrows type correctly when true', () => {
    const role: string = 'org_admin'
    if (isAdmin(role)) {
      const narrowed: 'org_admin' = role
      expect(narrowed).toBe('org_admin')
    }
  })
})

describe('isSuperAdmin', () => {
  it('returns true for super_admin role', () => {
    expect(isSuperAdmin('super_admin')).toBe(true)
  })
  it('returns false for other roles', () => {
    expect(isSuperAdmin('org_admin')).toBe(false)
    expect(isSuperAdmin('program_manager')).toBe(false)
    expect(isSuperAdmin('staff')).toBe(false)
    expect(isSuperAdmin('external_signer')).toBe(false)
  })
  it('returns false for unknown role', () => {
    expect(isSuperAdmin('unknown')).toBe(false)
  })
  it('narrows type correctly when true', () => {
    const role: string = 'super_admin'
    if (isSuperAdmin(role)) {
      const narrowed: 'super_admin' = role
      expect(narrowed).toBe('super_admin')
    }
  })
})

describe('isExternalSigner', () => {
  it('returns true for external_signer role', () => {
    expect(isExternalSigner('external_signer')).toBe(true)
  })
  it('returns false for other roles', () => {
    expect(isExternalSigner('staff')).toBe(false)
    expect(isExternalSigner('org_admin')).toBe(false)
    expect(isExternalSigner('program_manager')).toBe(false)
    expect(isExternalSigner('super_admin')).toBe(false)
  })
  it('returns false for unknown role', () => {
    expect(isExternalSigner('unknown')).toBe(false)
  })
  it('narrows type correctly when true', () => {
    const role: string = 'external_signer'
    if (isExternalSigner(role)) {
      const narrowed: 'external_signer' = role
      expect(narrowed).toBe('external_signer')
    }
  })
})

describe('getRoleRedirectPath', () => {
  it('redirects super_admin to /super-admin', () => {
    expect(getRoleRedirectPath('super_admin')).toBe('/super-admin')
  })
  it('redirects org_admin to /dashboard', () => {
    expect(getRoleRedirectPath('org_admin')).toBe('/dashboard')
  })
  it('redirects program_manager to /dashboard', () => {
    expect(getRoleRedirectPath('program_manager')).toBe('/dashboard')
  })
  it('redirects staff to /dashboard', () => {
    expect(getRoleRedirectPath('staff')).toBe('/dashboard')
  })
  it('redirects external_signer to /client', () => {
    expect(getRoleRedirectPath('external_signer')).toBe('/client')
  })
})

describe('ROLE_PATHS exhaustiveness', () => {
  const allRoles: Role[] = ['super_admin', 'org_admin', 'program_manager', 'staff', 'external_signer']

  it('provides a redirect path for every role', () => {
    for (const role of allRoles) {
      expect(getRoleRedirectPath(role)).toEqual(expect.any(String))
    }
  })

  it('has unique paths per role group', () => {
    const paths = allRoles.map((r) => getRoleRedirectPath(r))
    expect(paths.filter((p) => p === '/dashboard')).toHaveLength(3)
    expect(paths.filter((p) => p === '/super-admin')).toHaveLength(1)
    expect(paths.filter((p) => p === '/client')).toHaveLength(1)
  })
})
