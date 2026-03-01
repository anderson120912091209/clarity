'use client'
import { db } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle';
import { useLocale } from '@/contexts/LocaleContext'
import { addLocalePrefix } from '@/lib/i18n/pathname'

export default function AuthButtons() {
  const { user } = db.useAuth()
  const { locale } = useLocale()
  const loginHref = addLocalePrefix('/login', locale)

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <Button
          size="sm"
          className="rounded-none border-white/10 bg-transparent text-[11px] font-bold tracking-tight hover:bg-white/5 h-8 px-4"
          asChild
        >
          <Link href="/projects">
            <LayoutGrid className="h-3 w-3 mr-2 opacity-50" />
            Projects
          </Link>
        </Button>
      ) : (
        <Button 
          size="sm" 
          className="rounded-none bg-white text-black hover:bg-zinc-200 text-[11px] font-bold tracking-tight h-8 px-4"
          asChild
        >
          <Link href={loginHref}>Log In</Link>
        </Button>
      )}
      <div className="opacity-40 hover:opacity-100 transition-opacity translate-y-[1px]">
        <ModeToggle />
      </div>
    </div>
  )
}
