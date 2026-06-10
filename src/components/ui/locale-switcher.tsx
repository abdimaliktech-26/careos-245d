'use client'

import { useLocale } from './locale-provider'
import type { Locale } from '@/lib/i18n/translations'

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'so' : 'en')
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      title={locale === 'en' ? 'Ku beddel Af Soomaali' : 'Switch to English'}
    >
      <span className={`${locale === 'en' ? 'text-[#E8799E] font-bold' : 'text-gray-400'}`}>EN</span>
      <span className="text-gray-300">/</span>
      <span className={`${locale === 'so' ? 'text-[#E8799E] font-bold' : 'text-gray-400'}`}>SO</span>
    </button>
  )
}
