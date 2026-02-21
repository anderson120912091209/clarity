'use client'

import { db } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export function AuthButton() {
  const { user } = db.useAuth()
  const { t } = useLocale()

  if (user) {
    return (
        <Link className="hidden md:flex items-center gap-8 text-[13px]
        hover:text-white font-medium text-zinc-400"
        href="/projects">
          {t('nav.dashboard')}
        </Link>
    )
  }

  return (
    <div className="flex items-center gap-6">
      <Link
        href="/login"
        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        {t('nav.signin')}
      </Link>
      <Button
        asChild
        className="h-9 px-5 bg-white text-black hover:bg-zinc-200
         font-medium text-sm rounded-full transition-colors"
      >
        <Link href="/login">
          {t('nav.signup')}
        </Link>
      </Button>
    </div>
  )
}
