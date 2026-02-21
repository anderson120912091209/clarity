'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function CtaSection() {
  const { t } = useLocale()

  return (
    <section className="py-24 md:py-32 px-6 bg-[#0c0c0e]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mosaic-hero rounded-3xl py-16 md:py-24 px-8 md:px-16 flex flex-col items-center text-center"
        >
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
              {t('cta.headline') ?? 'Start writing with clarity.'}
            </h2>
            <p className="text-white/70 max-w-xl text-base md:text-lg mb-10 leading-relaxed">
              {t('cta.subtext') ?? 'Join researchers worldwide who write faster and collaborate better with AI-powered tools.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                asChild
                className="h-12 px-8 bg-white text-black hover:bg-zinc-200
                 text-sm font-semibold shadow-lg rounded-full transition-colors cursor-crosshair"
              >
                <Link href="/login" className="flex h-full items-center justify-center gap-2 cursor-crosshair">
                  {t('cta.button') ?? 'Get Started Free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 px-8 text-white/80 hover:text-white hover:bg-white/10
                 text-sm font-medium rounded-full transition-colors cursor-crosshair border border-white/15"
              >
                <a href="https://discord.gg/JHQhC8VstM" target="_blank" rel="noopener noreferrer" className="flex h-full items-center justify-center cursor-crosshair">
                  {t('cta.discord') ?? 'Join Discord'}
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
