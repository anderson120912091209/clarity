'use client'

import { Eye, Pencil, Globe } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { IdeChatSvg } from './animated-svgs/ide-chat-svg'
import { ServerStackSvg } from './animated-svgs/server-stack-svg'
import { NodesSyncSvg } from './animated-svgs/nodes-sync-svg'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

/* Each palette is a CSS background with multiple radial-gradients */
const mosaicPalettes = {
  warm: `
    radial-gradient(ellipse 350px 300px at 15% 30%, rgba(255,120,90,0.55) 0%, transparent 70%),
    radial-gradient(ellipse 300px 350px at 75% 60%, rgba(255,180,120,0.45) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 50% 85%, rgba(255,100,160,0.40) 0%, transparent 70%),
    radial-gradient(ellipse 200px 200px at 85% 20%, rgba(255,210,80,0.30) 0%, transparent 70%)
  `,
  cool: `
    radial-gradient(ellipse 350px 300px at 20% 25%, rgba(80,140,255,0.55) 0%, transparent 70%),
    radial-gradient(ellipse 300px 350px at 80% 65%, rgba(140,100,255,0.45) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 45% 80%, rgba(80,200,255,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 200px 200px at 70% 15%, rgba(160,130,255,0.30) 0%, transparent 70%)
  `,
  nature: `
    radial-gradient(ellipse 350px 300px at 25% 35%, rgba(60,220,160,0.50) 0%, transparent 70%),
    radial-gradient(ellipse 300px 350px at 80% 55%, rgba(80,200,255,0.40) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 50% 80%, rgba(100,255,180,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 200px 200px at 15% 70%, rgba(60,180,220,0.30) 0%, transparent 70%)
  `,
  sunset: `
    radial-gradient(ellipse 350px 300px at 20% 40%, rgba(255,100,80,0.50) 0%, transparent 70%),
    radial-gradient(ellipse 300px 350px at 75% 30%, rgba(255,160,60,0.45) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 55% 75%, rgba(200,80,180,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 200px 200px at 90% 70%, rgba(255,200,100,0.30) 0%, transparent 70%)
  `,
  lavender: `
    radial-gradient(ellipse 350px 300px at 15% 45%, rgba(180,120,255,0.50) 0%, transparent 70%),
    radial-gradient(ellipse 300px 350px at 80% 30%, rgba(120,140,255,0.45) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 50% 80%, rgba(220,160,255,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 200px 200px at 70% 65%, rgba(160,200,255,0.30) 0%, transparent 70%)
  `,
} as const

/** Reusable hover-mosaic layers. Renders gradient blobs + halftone dots that fade in on group-hover. */
function MosaicHoverLayer({ palette }: { palette: keyof typeof mosaicPalettes }) {
  return (
    <>
      {/* Gradient blobs */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out pointer-events-none z-0"
        style={{ background: mosaicPalettes[palette], filter: 'blur(40px) saturate(1.4)' }}
      />
      {/* Halftone dot overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '5px 5px',
        }}
      />
    </>
  )
}

export function Features() {
  const { t } = useLocale()

  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-[#0c0c0e]">
      <div className="max-w-5xl mx-auto">

        {/* Section Label */}
        <div className="flex items-center justify-between mb-16 md:mb-20">
          <span className="section-label">{t('features.label')}</span>
          <span className="section-label">/ {t('features.label_suffix')}</span>
        </div>

        {/* Section Header */}
        <div className="mb-16 md:mb-20">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-zinc-100 mb-6 tracking-tight leading-[1.1]">
            {t('features.section_title')}
          </h2>
          <p className="text-zinc-400 max-w-2xl text-base md:text-lg leading-relaxed">
            {t('features.section_subtitle')}
          </p>
        </div>

        {/* ── Primary Feature Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">

          {/* AI Copilot - Large Card, warm mosaic on hover */}
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden flex flex-col justify-end lg:row-span-2 min-h-[450px] md:min-h-[550px] relative"
          >
            <MosaicHoverLayer palette="warm" />

            <div className="absolute inset-x-0 top-0 bottom-40 flex items-center justify-center pointer-events-none overflow-hidden z-[2]">
              <IdeChatSvg
                className="-translate-y-4 translate-x-4"
                translateX={280}
                translateY={240}
                scale={1.1}
              />
            </div>
            <div className="relative z-10 w-full p-8 md:p-10 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent pt-40">
              <span className="section-label mb-4 block text-[10px]">{t('features.ai_label')}</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{t('features.ai_copilot_title')}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm md:text-base max-w-lg">
                {t('features.ai_copilot_desc')}
              </p>
            </div>
          </motion.div>

          {/* Instant Compilation - cool mosaic on hover */}
          <motion.div
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden flex flex-col justify-end min-h-[280px] md:min-h-[265px] relative"
          >
            <MosaicHoverLayer palette="cool" />

            <div className="absolute inset-x-0 top-0 bottom-28 flex items-center justify-center pointer-events-none overflow-hidden z-[1]">
              <ServerStackSvg
                className="-translate-y-4"
                translateX={300}
                translateY={530}
                scale={2.2}
              />
            </div>
            <div className="relative z-10 w-full p-6 md:p-8 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent pt-16">
              <span className="section-label mb-3 block text-[10px]">{t('features.compilation_label')}</span>
              <h3 className="text-xl font-bold text-white mb-2">{t('features.compilation_title')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t('features.compilation_desc')}
              </p>
            </div>
          </motion.div>

          {/* Real-time Sync - nature mosaic on hover */}
          <motion.div
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden flex flex-col justify-end min-h-[280px] md:min-h-[265px] relative"
          >
            <MosaicHoverLayer palette="nature" />

            <div className="absolute inset-x-0 top-0 bottom-24 flex items-center justify-center pointer-events-none overflow-hidden z-[1]">
              <NodesSyncSvg
                className="-translate-y-4"
                translateX={20}
                translateY={40}
                scale={1.8}
              />
            </div>
            <div className="relative z-10 w-full p-6 md:p-8 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent pt-16">
              <span className="section-label mb-3 block text-[10px]">{t('features.sync_label')}</span>
              <h3 className="text-xl font-bold text-white mb-2">{t('features.sync_title')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t('features.sync_desc')}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Secondary Feature Strip ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

          {/* Smart Preview - lavender mosaic on hover */}
          <motion.div
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden p-8 flex flex-col min-h-[220px] relative"
          >
            <MosaicHoverLayer palette="lavender" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 group-hover:border-white/15 transition-colors duration-500">
                <Eye className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('features.preview_title')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300/80 transition-colors duration-500">
                {t('features.preview_desc')}
              </p>
            </div>
          </motion.div>

          {/* Fast & Precise Edit - sunset mosaic on hover */}
          <motion.div
            custom={4}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden p-8 flex flex-col min-h-[220px] relative"
          >
            <MosaicHoverLayer palette="sunset" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 group-hover:border-white/15 transition-colors duration-500">
                <Pencil className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('features.edit_title')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300/80 transition-colors duration-500">
                {t('features.edit_desc')}
              </p>
            </div>
          </motion.div>

          {/* Anywhere - warm mosaic on hover */}
          <motion.div
            custom={5}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            className="group feature-card rounded-2xl overflow-hidden p-8 flex flex-col min-h-[220px] relative"
          >
            <MosaicHoverLayer palette="warm" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 group-hover:border-white/15 transition-colors duration-500">
                <Globe className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('features.anywhere_title')}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300/80 transition-colors duration-500">
                {t('features.anywhere_desc')}
              </p>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  )
}
