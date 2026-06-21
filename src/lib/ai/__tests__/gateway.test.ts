import { describe, test, expect, vi, beforeEach } from 'vitest'

const insert = vi.fn(() => ({ then: (r: () => void) => r() }))
const maybeSingle = vi.fn()
const rpc = vi.fn(() => ({ then: (r: () => void) => r() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ insert, select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
    rpc,
  }),
}))
const generateText = vi.fn()
vi.mock('ai', () => ({ generateText: (...a: unknown[]) => generateText(...a) }))
vi.mock('../provider', () => ({
  getPrimaryProvider: () => 'anthropic', getFallbackProvider: () => 'none',
  getModel: () => ({}), getModelName: () => 'claude-haiku-4-5', isAiConfigured: () => true,
}))
vi.mock('../settings', () => ({
  getOrgAiSettings: async () => ({ aiEnabled: true, monthlyLimit: 100, features: {} }),
  isFeatureEnabled: () => true,
}))

import { runAiText } from '../gateway'

beforeEach(() => { vi.clearAllMocks(); maybeSingle.mockResolvedValue({ data: { count: 0 } }) })

describe('runAiText', () => {
  test('success returns draft text + increments usage', async () => {
    generateText.mockResolvedValueOnce({ text: 'hello', usage: { inputTokens: 5, outputTokens: 2 } })
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: true, text: 'hello', isDraft: true })
    expect(rpc).toHaveBeenCalledOnce()
  })
  test('over limit blocks', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { count: 100 } })
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: false, reason: 'limit_reached' })
  })
  test('model error returns ai_error, never throws', async () => {
    generateText.mockRejectedValueOnce(new Error('boom'))
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: false, reason: 'ai_error' })
  })
})
