'use client'

import { Brain, Cpu, Users, Quote, Zap, Globe } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { IdeChatSvg } from './animated-svgs/ide-chat-svg'
import { ServerStackSvg } from './animated-svgs/server-stack-svg'
import { NodesSyncSvg } from './animated-svgs/nodes-sync-svg'

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[800px]">

             {/* Main AI Feature */}
             <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#121214] to-[#0a0a0c] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-end lg:row-span-2 min-h-[450px]">
                {/* Visual Area (Absolute covering the card) */}
                <div className="absolute inset-x-0 top-0 bottom-40 flex items-center justify-center pointer-events-none overflow-hidden">
                   <IdeChatSvg 
                     className="-translate-y-4 translate-x-4" 
                     translateX={280} 
                     translateY={240} 
                     scale={1.1} 
                   />
                </div>
                 {/* Text block positioned cleanly at the bottom */}
                 <div className="relative z-10 w-full p-8 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent pt-40">
                    <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">{t('features.ai_copilot_title')}</h3>
                    <p className="text-zinc-400 leading-relaxed text-base max-w-lg mb-4">
                        {t('features.ai_copilot_desc')}
                    </p>
                </div>
             </div>
 
              {/* Tectonic Engine */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#121214] to-[#0a0a0c] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-end min-h-[350px]">
                 <div className="absolute inset-x-0 top-0 bottom-32 flex items-center justify-center pointer-events-none overflow-hidden">
                    <ServerStackSvg 
                      className="-translate-y-4" 
                      translateX={300} 
                      translateY={530} 
                      scale={2.2} 
                    />
                 </div>
                 <div className="relative z-10 w-full p-8 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent pt-32">
                     <h3 className="text-xl font-bold text-white mb-2">{t('features.compilation_title')}</h3>
                     <p className="text-zinc-400 text-sm leading-relaxed mb-2">
                         {t('features.compilation_desc')}
                     </p>
                 </div>
              </div>
 
              {/* Collaboration */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#121214] to-[#0a0a0c] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-end min-h-[350px]">
                 <div className="absolute inset-x-0 top-0 bottom-32 flex items-center justify-center pointer-events-none overflow-hidden">
                    <NodesSyncSvg 
                      className="-translate-y-4" 
                      translateX={20} 
                      translateY={40} 
                      scale={1.8} 
                    />
                 </div>
                  <div className="relative z-10 w-full p-8 mt-auto pointer-events-none bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent pt-32">
                     <h3 className="text-xl font-bold text-white mb-2">{t('features.sync_title')}</h3>
                     <p className="text-zinc-400 text-sm leading-relaxed mb-2">
                         {t('features.sync_desc')}
                     </p>
                 </div>
              </div>




        </div>
      </div>
    </section>
  )
}
