import { useLocale } from '@/components/ui/locale-provider'
import { t } from '@/lib/i18n/translations'

export function useTranslation() {
  const { locale } = useLocale()

  return {
    locale,
    t: (key: string) => t(locale, key),
  }
}
