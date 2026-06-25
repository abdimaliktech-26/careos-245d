import { describe, expect, test } from 'vitest'
import { NAV_GROUPS, visibleNavGroups } from '@/components/layout/nav-config'

describe('nav-config', () => {
  test('defines care, compliance, medications, audit-readiness, business, workspace, admin groups in order', () => {
    expect(NAV_GROUPS.map((group) => group.id)).toEqual([
      'care',
      'compliance',
      'medications',
      'audit-readiness',
      'business',
      'workspace',
      'admin',
    ])
  })

  test('every nav item has href, label, and icon', () => {
    for (const group of NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.href).toMatch(/^\//)
        expect(item.translationKey.length).toBeGreaterThan(0)
        expect(item.icon).toBeDefined()
      }
    }
  })

  test('admin group hidden for staff and program_manager', () => {
    expect(visibleNavGroups('staff').map((group) => group.id)).not.toContain('admin')
    expect(visibleNavGroups('program_manager').map((group) => group.id)).not.toContain('admin')
  })

  test('admin group visible for org_admin and super_admin', () => {
    expect(visibleNavGroups('org_admin').map((group) => group.id)).toContain('admin')
    expect(visibleNavGroups('super_admin').map((group) => group.id)).toContain('admin')
  })

  test('all previous routes still reachable', () => {
    const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))
    for (const href of [
      '/dashboard', '/notifications', '/clients', '/packets', '/notes',
      '/schedule', '/evv', '/incidents', '/billing-readiness', '/documents',
      '/form-library', '/staff/directory', '/ai', '/qa', '/analytics',
      '/billing-readiness/claims', '/billing-readiness/authorizations', '/help',
      '/admin/settings', '/admin/staff', '/admin/audit-log',
    ]) {
      expect(hrefs).toContain(href)
    }
  })
})
