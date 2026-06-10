'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Locale } from '@/lib/i18n/translations'

type LocaleContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
})

export function useLocale() {
  return useContext(LocaleContext)
}

export function LocaleProvider({ children, initialLocale = 'en' }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l
    }
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
