import { describe, it, expect } from 'vitest'
import {
  isStaff,
  isAdmin,
  isSuperAdmin,
  isClient,
  getRoleRedirectPath,
  ROLES,
} from '@/lib/auth/role-guards'

describe('ROLES constant', () => {
  it('has all four roles', () => {
    expect(ROLES.SUPER_ADMIN).toBe('super_admin')
    expect(ROLES.ADMIN).toBe('admin')
    expect(ROLES.STAFF).toBe('staff')
    expect(ROLES.CLIENT).toBe('client')
  })
})

describe('isStaff', () => {
  it('returns true for staff role', () => {
    expect(isStaff('staff')).toBe(true)
  })
  it('returns false for non-staff roles', () => {
    expect(isStaff('admin')).toBe(false)
    expect(isStaff('super_admin')).toBe(false)
    expect(isStaff('client')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('returns true for admin role', () => {
    expect(isAdmin('admin')).toBe(true)
  })
  it('returns false for non-admin roles', () => {
    expect(isAdmin('staff')).toBe(false)
    expect(isAdmin('super_admin')).toBe(false)
    expect(isAdmin('client')).toBe(false)
  })
})

describe('isSuperAdmin', () => {
  it('returns true for super_admin role', () => {
    expect(isSuperAdmin('super_admin')).toBe(true)
  })
  it('returns false for other roles', () => {
    expect(isSuperAdmin('admin')).toBe(false)
    expect(isSuperAdmin('staff')).toBe(false)
    expect(isSuperAdmin('client')).toBe(false)
  })
})

describe('isClient', () => {
  it('returns true for client role', () => {
    expect(isClient('client')).toBe(true)
  })
  it('returns false for other roles', () => {
    expect(isClient('staff')).toBe(false)
    expect(isClient('admin')).toBe(false)
    expect(isClient('super_admin')).toBe(false)
  })
})

describe('getRoleRedirectPath', () => {
  it('redirects super_admin to /super-admin', () => {
    expect(getRoleRedirectPath('super_admin')).toBe('/super-admin')
  })
  it('redirects admin to /admin', () => {
    expect(getRoleRedirectPath('admin')).toBe('/admin')
  })
  it('redirects staff to /staff', () => {
    expect(getRoleRedirectPath('staff')).toBe('/staff')
  })
  it('redirects client to /client', () => {
    expect(getRoleRedirectPath('client')).toBe('/client')
  })
})
