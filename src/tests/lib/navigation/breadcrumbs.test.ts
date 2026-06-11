import { describe, expect, test } from 'vitest'
import { breadcrumbsFromPath } from '@/lib/navigation/breadcrumbs'

describe('breadcrumbsFromPath', () => {
  test('returns single crumb for top-level route', () => {
    expect(breadcrumbsFromPath('/dashboard')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
    ])
  })

  test('builds nested crumbs with cumulative hrefs', () => {
    expect(breadcrumbsFromPath('/billing-readiness/claims')).toEqual([
      { label: 'Billing Readiness', href: '/billing-readiness' },
      { label: 'Claims', href: '/billing-readiness/claims' },
    ])
  })

  test('replaces UUID segments with Detail', () => {
    expect(
      breadcrumbsFromPath('/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1/goals')
    ).toEqual([
      { label: 'Clients', href: '/clients' },
      { label: 'Detail', href: '/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1' },
      { label: 'Goals', href: '/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1/goals' },
    ])
  })

  test('handles root and empty paths', () => {
    expect(breadcrumbsFromPath('/')).toEqual([])
    expect(breadcrumbsFromPath('')).toEqual([])
  })

  test('uses label overrides where titles differ from slugs', () => {
    expect(breadcrumbsFromPath('/evv')).toEqual([{ label: 'EVV', href: '/evv' }])
    expect(breadcrumbsFromPath('/qa')).toEqual([
      { label: 'Quality Assurance', href: '/qa' },
    ])
    expect(breadcrumbsFromPath('/ai')).toEqual([{ label: 'AI Tools', href: '/ai' }])
  })
})
