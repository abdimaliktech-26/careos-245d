import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

/**
 * Env-driven AI provider resolution. No keys are hardcoded; all come from the
 * environment. When no provider is configured, AI is simply off and the rest of
 * the platform is unaffected.
 */
export type AiProvider = 'anthropic' | 'openai' | 'none'

function hasKey(p: AiProvider): boolean {
  if (p === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  return false
}

export function getModelName(p: AiProvider): string {
  if (p === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  return ''
}

/** Configured primary provider, downgraded to 'none' if its key is missing. */
export function getPrimaryProvider(): AiProvider {
  const want = (process.env.AI_PROVIDER || 'anthropic').toLowerCase() as AiProvider
  if (want === 'none') return 'none'
  if (want === 'anthropic' || want === 'openai') return hasKey(want) ? want : 'none'
  return 'none'
}

/** The other provider, only if its key exists (used as automatic fallback). */
export function getFallbackProvider(): AiProvider {
  const primary = getPrimaryProvider()
  if (primary === 'anthropic' && hasKey('openai')) return 'openai'
  if (primary === 'openai' && hasKey('anthropic')) return 'anthropic'
  return 'none'
}

export function getModel(p: AiProvider): LanguageModel | null {
  if (p === 'anthropic' && hasKey('anthropic')) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(getModelName('anthropic'))
  }
  if (p === 'openai' && hasKey('openai')) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })(getModelName('openai'))
  }
  return null
}

export function isAiConfigured(): boolean {
  return getPrimaryProvider() !== 'none'
}

// Back-compat: existing imports of `aiModel` keep working until the gateway
// refactor (Task 6) removes them. Cast keeps callers' types valid; if no provider
// is configured the call fails at runtime exactly as it did before (key absent).
export const aiModel = getModel(getPrimaryProvider()) as LanguageModel
