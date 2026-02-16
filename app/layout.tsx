import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import '@/styles/agent/quick-edit.css'
import { FrontendProvider } from '@/contexts/FrontendContext'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from "@vercel/analytics/react"

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

// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
          <TooltipProvider>
            <FrontendProvider>
              {children}
              <Analytics />
            </FrontendProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
