'use client'

import { Brain, Cpu, Users, Quote, Zap, Globe } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export function Features() {
  const { t } = useLocale()

  return (
    <section id="features" className="py-24 px-6 bg-[#0c0c0e]">
      <div className="max-w-5xl mx-auto">
        <div className="mb-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-300 mb-6 tracking-tight">{t('features.section_title')}</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg font-normal">
                {t('features.section_subtitle')}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">

             {/* Main AI Feature */}
             <div className="md:col-span-2 row-span-1 md:row-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                <div className="relative z-10 h-full flex flex-col justify-end">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Brain className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{t('features.ai_copilot_title')}</h3>
                    <p className="text-zinc-400 leading-relaxed max-w-md text-base">
                        {t('features.ai_copilot_desc')}
                    </p>
                </div>
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Brain className="w-64 h-64 text-white" />
                </div>
             </div>

             {/* Tectonic Engine */}
             <div className="group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t('features.compilation_title')}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {t('features.compilation_desc')}
                    </p>
                </div>
             </div>

             {/* Collaboration */}
             <div className="group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                 <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t('features.sync_title')}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {t('features.sync_desc')}
                    </p>
                </div>
             </div>

             {/* Smart Preview */}
             <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 h-[400px]">
                 <div className="absolute inset-0">
                    <img
                        src="/landing/feature-showcase-1.png"
                        alt={t('features.preview_title')}
                        className="w-full h-full object-cover opacity-50 block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
                 </div>

                 <div className="relative z-10 h-full flex flex-col justify-end p-8">
                    <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 text-zinc-200 border border-white/10">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{t('features.preview_title')}</h3>
                    <p className="text-zinc-300 text-base leading-relaxed max-w-lg">
                        {t('features.preview_desc')}
                    </p>
                 </div>
             </div>

             {/* Fast and Precise Edit */}
             <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 h-[400px]">
                 <div className="absolute inset-0">
                    <img
                        src="/landing/feature-showcase-2.png"
                        alt={t('features.edit_title')}
                        className="w-full h-full object-cover opacity-50 block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
                 </div>

                 <div className="relative z-10 h-full flex flex-col justify-end p-8">
                    <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 text-zinc-200 border border-white/10">
                        <Quote className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{t('features.edit_title')}</h3>
                    <p className="text-zinc-300 text-base leading-relaxed max-w-lg">
                        {t('features.edit_desc')}
                    </p>
                 </div>
             </div>

             {/* Anywhere */}
             <div className="group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t('features.anywhere_title')}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {t('features.anywhere_desc')}
                    </p>
                </div>
             </div>

        </div>
      </div>
    </section>
  )
}
