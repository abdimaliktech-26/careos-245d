import en from './messages/en.json'
import so from './messages/so.json'

export type Locale = 'en' | 'so'

export const messages = { en, so }

export const DEFAULT_LOCALE: Locale = 'en'

export function t(locale: Locale, key: string): string {
  const parts = key.split('.')
  const msg = locale === 'en' ? en : locale === 'so' ? so : en
  let current: Record<string, unknown> = msg as unknown as Record<string, unknown>

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return key
    const next = current[part]
    if (typeof next === 'string') return next
    current = next as Record<string, unknown>
  }

  return key
}
