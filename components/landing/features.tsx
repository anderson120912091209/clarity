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
                    <h3 className="text-2xl font-bold text-white mb-3">Clarity AI Copilot</h3>
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

             {/* Smart Preview */}
             <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 h-[400px]">
                 <div className="absolute inset-0">
                    <img 
                        src="/landing/feature-showcase-1.png" 
                        alt="Smart Preview"
                        className="w-full h-full object-cover opacity-50 block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
                 </div>
                 
                 <div className="relative z-10 h-full flex flex-col justify-end p-8">
                    <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 text-zinc-200 border border-white/10">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Smart Preview</h3>
                    <p className="text-zinc-300 text-base leading-relaxed max-w-lg">
                        See your document come to life as you type. Instant compilation with zero lag, powered by our cloud infrastructure.
                    </p>
                 </div>
             </div>

             {/* Fast and Precise Edit */}
             <div className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-[#0c0c0e] border border-white/5 h-[400px]">
                 <div className="absolute inset-0">
                    <img 
                        src="/landing/feature-showcase-2.png" 
                        alt="Fast and Precise Edit"
                        className="w-full h-full object-cover opacity-50 block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
                 </div>

                 <div className="relative z-10 h-full flex flex-col justify-end p-8">
                    <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 text-zinc-200 border border-white/10">
                        <Quote className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Fast and Precise Edit</h3>
                    <p className="text-zinc-300 text-base leading-relaxed max-w-lg">
                        Make changes with confidence. Powerful editor with intelligent autocomplete, syntax highlighting, and real-time error detection.
                    </p>
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
