'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'
import { motion } from 'framer-motion'

export function Hero() {
  const { t } = useLocale()
  const productHuntLaunchUrl =
    'https://www.producthunt.com/products/clarity-21?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-clarity-89170959-d8de-41bc-a06f-3686aed72d5b'
  const productHuntBadgeSrc =
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1080188&theme=light&t=1771420904394'

  return (
    <section className="relative pt-28 md:pt-44 pb-0 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center">

        {/* Section Label */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="section-label mb-6 block"
        >
          {t('hero.section_label')}
        </motion.span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl leading-[1.08] font-bold tracking-tight text-zinc-100 mb-6 max-w-5xl [word-break:keep-all]"
        >
          {t('hero.headline')}
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="max-w-2xl text-base md:text-lg text-zinc-400 mb-10 leading-relaxed [word-break:keep-all]"
        >
          {t('hero.subtext')}
        </motion.p>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16 md:mb-24"
        >
          <Button
            asChild
            className="h-12 px-8 bg-white text-black hover:bg-zinc-200
             text-sm font-semibold shadow-lg rounded-full transition-colors cursor-crosshair"
          >
            <Link href="/login" className="flex h-full items-center justify-center cursor-crosshair">
              {t('hero.cta')}
            </Link>
          </Button>
          <a
            href={productHuntLaunchUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('hero.product_hunt_aria')}
            className="cursor-crosshair hidden sm:block"
          >
            <img
              src={productHuntBadgeSrc}
              alt={t('hero.product_hunt_alt')}
              className="block h-12 w-auto"
              width={250}
              height={54}
              loading="lazy"
            />
          </a>
        </motion.div>

        {/* Mosaic Background with Product Screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[1100px] mx-auto"
        >
          {/* Mosaic Container */}
          <div className="mosaic-hero rounded-2xl md:rounded-3xl pt-8 md:pt-16 px-4 md:px-12">
            {/* Foreground Screenshot */}
            <div className="relative z-10 shadow-2xl rounded-t-xl overflow-hidden border
             mx-auto bg-white translate-y-px">
              <img
                src="/landing/hero-light.png"
                alt={t('hero.screenshot_alt')}
                className="w-full h-auto block"
              />
            </div>
          </div>

          {/* Bottom fade into page background */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0c0c0e] to-transparent z-20 pointer-events-none" />
        </motion.div>

        {/* Product Hunt - Mobile Only */}
        <a
          href={productHuntLaunchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('hero.product_hunt_aria')}
          className="cursor-crosshair mx-auto mt-8 block sm:hidden"
        >
          <img
            src={productHuntBadgeSrc}
            alt={t('hero.product_hunt_alt')}
            className="block h-auto w-full max-w-[250px]"
            width={250}
            height={54}
            loading="lazy"
          />
        </a>

      </div>
    </section>
  )
}
