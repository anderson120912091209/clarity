'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export function FooterContent() {
  const { t } = useLocale()

  return (
    <div className="w-full flex flex-col gap-0">
      {/* Top row: Logo + Nav links */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 mb-8">
        {/* Left: Logo & tagline */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/landing/claritylogopurple.png"
              alt="Clarity"
              className="h-7 w-auto opacity-80"
            />
          </Link>
          <p className="text-zinc-500 text-xs max-w-xs text-center md:text-left leading-relaxed">
            AI-powered collaborative editor for researchers.
          </p>
        </div>

        {/* Right: Nav columns */}
        <div className="flex items-center gap-8">
          <Link
            href="/docs"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t('nav.docs')}
          </Link>
          <Link
            href="/blogs"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t('nav.blogs')}
          </Link>
          <a
            href="https://discord.gg/JHQhC8VstM"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Discord
          </a>
          <Link
            href="/login"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t('nav.signin')}
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-white/5 mb-6" />

      {/* Bottom row: Copyright */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <span className="text-zinc-600 text-xs">
          {t('footer.copyright')}
        </span>
        <span className="text-zinc-600 text-xs">
          Terms of Service &middot; Privacy Policy
        </span>
      </div>
    </div>
  )
}
