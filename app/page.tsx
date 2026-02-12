import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Pricing } from '@/components/landing/pricing'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0c0c0e] text-zinc-300 selection:bg-[#94a3b8]/20 selection:text-zinc-100 antialiased overflow-x-hidden">
      
      {/* Background Ambience removed for cleaner look */}

      <Navbar />
      
      <main className="relative z-10 w-full">
        <Hero />
        <Pricing />
        
        {/* Bottom CTA */}
        <section className="py-24 px-6 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to write precise ideas?</h2>
            <Button asChild className="h-12 px-8 bg-white text-black hover:bg-zinc-200 font-bold rounded-lg transition-all">
                <Link href="/login">Get Started Now</Link>
            </Button>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 relative z-10 bg-[#050505]">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-zinc-500 text-xs">
                  © 2026 Clarity Research. All rights reserved.
              </div>
              <div className="flex gap-6 text-xs text-zinc-500 font-medium">
                  <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                  <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                  <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
                  <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
              </div>
          </div>
      </footer>

    </div>
  )
}
