import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'

export default function Home() {
  return (
    <div className="landing-page flex flex-col min-h-screen bg-[#0c0c0e] text-zinc-300 selection:bg-[#94a3b8]/20 selection:text-zinc-100 antialiased overflow-x-hidden cursor-crosshair">
      
      {/* Background Ambience removed for cleaner look */}

      <Navbar />
      
      <main className="relative z-10 w-full">
        <Hero />
      </main>

      <footer className="py-12 border-t border-white/5 relative z-10 bg-[#050505]">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-zinc-500 text-xs text-center md:text-left w-full">
                  © 2026 Clarity Research. All rights reserved.
              </div>
          </div>
      </footer>

    </div>
  )
}
