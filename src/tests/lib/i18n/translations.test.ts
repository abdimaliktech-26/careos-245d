import { describe, it, expect } from 'vitest'
import { t } from '@/lib/i18n/translations'

describe('translations', () => {
  it('returns English value for existing key', () => {
    expect(t('en', 'common.save')).toBe('Save')
    expect(t('en', 'incident.title')).toBe('Incidents')
    expect(t('en', 'analytics.title')).toBe('Analytics')
  })

  it('returns Somali value for existing key', () => {
    expect(t('so', 'common.save')).toBe('Kaydi')
    expect(t('so', 'incident.title')).toBe('Shilalka')
    expect(t('so', 'analytics.title')).toBe('Falanqaynta')
  })

  it('returns nested key for incidents.categories', () => {
    expect(t('en', 'incident.categories.injury')).toBe('Injury')
    expect(t('so', 'incident.categories.injury')).toBe('Dhaawac')
  })

  it('returns key when translation is missing', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('falls back to English when locale is unknown', () => {
    expect(t('fr' as never, 'common.save')).toBe('Save')
  })
})
