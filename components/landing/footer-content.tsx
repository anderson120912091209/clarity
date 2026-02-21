'use client'

import { useLocale } from '@/contexts/LocaleContext'

export function FooterContent() {
  const { t } = useLocale()

  return (
    <div className="text-zinc-500 text-xs text-center md:text-left w-full">
      {t('footer.copyright')}
    </div>
  )
}
