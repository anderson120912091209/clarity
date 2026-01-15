'use client'

import { cn } from '@/lib/utils'
import { Brain, Cpu, Users, Quote, Zap, Globe } from 'lucide-react'

export function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-[#0c0c0e]">
      <div className="max-w-5xl mx-auto">
        <div className="mb-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-300 mb-6 tracking-tight">Designed for flow.</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg font-normal">
                Everything you need to write standard-setting documents, without the standard headaches.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
             
             {/* Main AI Feature */}
             <div className="md:col-span-2 row-span-1 md:row-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                <div className="relative z-10 h-full flex flex-col justify-end">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Brain className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Jules AI Copilot</h3>
                    <p className="text-zinc-400 leading-relaxed max-w-md text-base">
                        Your personal research assistant. Generate complex tables, fix compilation errors instantly, or rewrite sections for clarity—all without leaving the editor.
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
                    <h3 className="text-lg font-bold text-white mb-2">Instant Compilation</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Forget Pkg updates. Our cloud engine handles packages automatically and compiles your PDF in milliseconds.
                    </p>
                </div>
             </div>

             {/* Collaboration */}
             <div className="group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                 <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Real-time Sync</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Collaborate with your team as if you're in the same room. Live cursors, instant updates, zero conflicts.
                    </p>
                </div>
             </div>

             {/* Smart Citations */}
             <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors flex flex-col md:flex-row items-center gap-8">
                 <div className="flex-1">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Quote className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Smart Citations</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Seamlessly integrate with Zotero. Search your library and insert perfectly formatted citations with a single keystroke.
                    </p>
                 </div>
                 <div className="w-full md:w-1/3 bg-black/20 rounded-lg border border-white/5 h-32 md:h-full p-4 flex flex-col gap-2 relative overflow-hidden">
                     {/* Citation Mock */}
                     <div className="bg-[#1a1a1c] p-2 rounded border border-white/5 text-[10px] text-zinc-400 flex items-center gap-2">
                        <span className="text-zinc-200">@article</span>
                        <span className="text-zinc-500">vaswani2017attention</span>
                     </div>
                     <div className="bg-[#1a1a1c] p-2 rounded border border-white/5 text-[10px] text-zinc-400 flex items-center gap-2">
                         <span className="text-zinc-200">@book</span>
                         <span className="text-zinc-500">knuth1984texbook</span>
                     </div>
                 </div>
             </div>

             {/* Anywhere */}
             <div className="group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 p-8 transition-colors">
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-zinc-200">
                        <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Anywhere</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Browser-based means device agnostic. Continue your thesis on your iPad or review papers on your phone.
                    </p>
                </div>
             </div>

        </div>
      </div>
    </section>
  )
}
