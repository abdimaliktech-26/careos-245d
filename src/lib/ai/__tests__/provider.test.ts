import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { getPrimaryProvider, getFallbackProvider, isAiConfigured, getModelName } from '../provider'

const ORIG = { ...process.env }
beforeEach(() => { delete process.env.AI_PROVIDER; delete process.env.ANTHROPIC_API_KEY; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL })
afterEach(() => { process.env = { ...ORIG } })

describe('provider resolution', () => {
  test('anthropic chosen + key present', () => {
    process.env.AI_PROVIDER = 'anthropic'; process.env.ANTHROPIC_API_KEY = 'k'
    expect(getPrimaryProvider()).toBe('anthropic'); expect(isAiConfigured()).toBe(true)
  })
  test('chosen provider without key downgrades to none', () => {
    process.env.AI_PROVIDER = 'anthropic'
    expect(getPrimaryProvider()).toBe('none'); expect(isAiConfigured()).toBe(false)
  })
  test('openai fallback when anthropic primary + openai key', () => {
    process.env.AI_PROVIDER = 'anthropic'; process.env.ANTHROPIC_API_KEY = 'k'; process.env.OPENAI_API_KEY = 'o'
    expect(getFallbackProvider()).toBe('openai')
  })
  test('AI_PROVIDER=none', () => {
    process.env.AI_PROVIDER = 'none'; process.env.ANTHROPIC_API_KEY = 'k'
    expect(getPrimaryProvider()).toBe('none')
  })
  test('model name override', () => {
    process.env.OPENAI_MODEL = 'gpt-x'; expect(getModelName('openai')).toBe('gpt-x')
  })
})
