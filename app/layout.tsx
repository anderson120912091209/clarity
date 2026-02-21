import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import '@/styles/agent/quick-edit.css'
import { FrontendProvider } from '@/contexts/FrontendContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from "@vercel/analytics/react"
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'

const manrope = Manrope({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: '{clarity}',
  description: 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: '{clarity}',
    description: 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
    images: ['/meta.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '{clarity}',
    description: 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
    images: ['/meta.png'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const dictionary = await getDictionary(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={manrope.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
          <TooltipProvider>
            <LocaleProvider initialLocale={locale} initialDictionary={dictionary}>
              <FrontendProvider>
                {children}
                <Analytics />
              </FrontendProvider>
            </LocaleProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
