import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

/**
 * Env-driven AI provider resolution. No keys are hardcoded; all come from the
 * environment. When no provider is configured, AI is simply off and the rest of
 * the platform is unaffected.
 */
export type AiProvider = 'anthropic' | 'openai' | 'deepseek' | 'none'

/** Provider preference order used to resolve automatic fallbacks. */
const PROVIDER_ORDER: AiProvider[] = ['anthropic', 'deepseek', 'openai']

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

function hasKey(p: AiProvider): boolean {
  if (p === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  if (p === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY)
  return false
}

export function getModelName(p: AiProvider): string {
  if (p === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  if (p === 'deepseek') return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  return ''
}

/** Configured primary provider, downgraded to 'none' if its key is missing. */
export function getPrimaryProvider(): AiProvider {
  const want = (process.env.AI_PROVIDER || 'anthropic').toLowerCase() as AiProvider
  if (want === 'none') return 'none'
  if (PROVIDER_ORDER.includes(want)) return hasKey(want) ? want : 'none'
  return 'none'
}

/** First other provider with a key (used as automatic fallback). */
export function getFallbackProvider(): AiProvider {
  const primary = getPrimaryProvider()
  for (const p of PROVIDER_ORDER) {
    if (p !== primary && hasKey(p)) return p
  }
  return 'none'
}

export function getModel(p: AiProvider): LanguageModel | null {
  if (p === 'anthropic' && hasKey('anthropic')) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(getModelName('anthropic'))
  }
  if (p === 'openai' && hasKey('openai')) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })(getModelName('openai'))
  }
  // DeepSeek is OpenAI-API-compatible. Use the OpenAI SDK with its base URL and
  // the .chat() (chat-completions) endpoint — DeepSeek has no /responses API.
  if (p === 'deepseek' && hasKey('deepseek')) {
    const deepseek = createOpenAI({ apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: DEEPSEEK_BASE_URL })
    return deepseek.chat(getModelName('deepseek'))
  }
  return null
}

export function isAiConfigured(): boolean {
  return getPrimaryProvider() !== 'none'
}
