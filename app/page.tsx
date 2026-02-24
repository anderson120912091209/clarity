import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { CtaSection } from '@/components/landing/cta-section'
import { FooterContent } from '@/components/landing/footer-content'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return {
    title: dict['meta.title'] ?? '{clarity}',
    description: dict['meta.description'] ?? 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
    openGraph: {
      title: dict['meta.title'] ?? '{clarity}',
      description: dict['meta.description'] ?? 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
      images: ['/meta.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict['meta.title'] ?? '{clarity}',
      description: dict['meta.description'] ?? 'AI Powered Overleaf Alternative, Supports LaTeX, Typst...',
      images: ['/meta.png'],
    },
  }
}

export default function Home() {
  return (
    <div className="landing-page flex flex-col min-h-screen bg-[#0c0c0e] text-zinc-300 selection:bg-[#94a3b8]/20 selection:text-zinc-100 antialiased overflow-x-hidden cursor-crosshair">

      <Navbar />

      <main className="relative z-10 w-full">
        <Hero />
        <Features />
        <CtaSection />
      </main>

      {/* Footer with Giant Brand Watermark */}
      <footer className="relative z-10 bg-[#050505] overflow-hidden">
        {/* Giant "{clarity}" watermark */}
        <div className="flex items-end justify-center overflow-hidden pointer-events-none select-none" aria-hidden="true">
          <span className="text-[28vw] md:text-[22vw] font-bold tracking-tighter leading-[0.75] text-white/[0.04] whitespace-nowrap translate-y-[15%]">
            {'{'}clarity{'}'}
          </span>
        </div>

        {/* Footer links */}
        <div className="border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <FooterContent />
          </div>
        </div>
      </footer>

    </div>
  )
}
