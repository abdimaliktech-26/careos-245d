import { describe, test, expect, vi } from 'vitest'

const maybeSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }) }) }),
  }),
}))
import { resolveServiceCode, serviceTypeFor } from '../service-codes'

describe('resolveServiceCode', () => {
  test('returns mapped code', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { procedure_code: 'T1019', aggregator_code: null, unit_minutes: 15 } })
    expect(await resolveServiceCode('o', 'MN', 'Personal Care')).toEqual({ procedureCode: 'T1019', aggregatorCode: null, unitMinutes: 15 })
  })
  test('returns null when unmapped', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null })
    expect(await resolveServiceCode('o', 'MN', 'Nope')).toBeNull()
  })
})

describe('serviceTypeFor', () => {
  test('prefers aggregator code, then procedure, then fallback', () => {
    expect(serviceTypeFor({ procedureCode: 'T1019', aggregatorCode: 'AGG1', unitMinutes: 15 }, 'x')).toBe('AGG1')
    expect(serviceTypeFor({ procedureCode: 'T1019', aggregatorCode: null, unitMinutes: 15 }, 'x')).toBe('T1019')
    expect(serviceTypeFor(null, 'Personal Care')).toBe('Personal Care')
  })
})
