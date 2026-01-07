import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import AuthButtons from '@/components/projects/auth-buttons';
import { Star } from 'lucide-react';
import { Github } from 'lucide-react';

export default async function Home() {
  const stars = await getGitHubStars();

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black font-sans antialiased overflow-hidden">
      {/* Texture & Light */}
      <div className="fixed inset-0 noise z-[100] opacity-[0.03]" />
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,rgba(246,224,94,0.03)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] blur-[80px]" />
      </div>

      <header className="fixed top-0 w-full z-50 px-6 py-8 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/" className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80 hover:opacity-100 transition-opacity">
            Jules
          </Link>
        </div>
        <div className="pointer-events-auto flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-medium tracking-tight text-white/40">
            <Link href="/" className="hover:text-white transition-colors">Features</Link>
            <Link href="/" className="hover:text-white transition-colors">Enterprise</Link>
            <Link href="/" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <AuthButtons />
        </div>
      </header>
      
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 z-10 scale-[0.98] animate-in fade-in duration-1000">
        <div className="max-w-[1000px] w-full flex flex-col items-center text-center">
          <div className="mb-12 flex items-center gap-4 px-4 py-1.5 rounded-none border border-white/5 bg-white/[0.01] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Early Access</span>
              <div className="w-[1px] h-2 bg-white/10" />
              <span className="text-[10px] font-bold text-white/40 tracking-tight">Available for macOS & Windows</span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <Link href="https://github.com/shelwinsunga/jules" target="_blank" className="flex items-center gap-2 group">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">GitHub</span>
                <span className="text-[10px] font-mono text-white/20">{stars}</span>
              </div>
            </Link>
          </div>

          <h1 className="text-[clamp(3.5rem,12vw,110px)] font-bold tracking-[-0.08em] leading-[0.85] text-white mb-8 max-w-[1000px]">
            The editor for<br/>
            <span className="text-transparent bg-clip-text bg-[linear-gradient(to_bottom,#fff_30%,#333_150%)]">precise </span>
            <span className="text-[#f6e05e]">ideas.</span>
          </h1>
          
          <p className="max-w-[460px] text-[16px] md:text-[18px] text-zinc-400 font-medium leading-relaxed tracking-tight mb-12">
            Jules is a reimagined LaTeX environment built for the AI era. 
            Refined tools for focused thought and elegant production.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild className="h-14 px-10 bg-[#f6e05e] text-black hover:bg-[#e2cd4d] text-[13px] font-bold tracking-tight rounded-sm transition-all shadow-[0_0_50px_rgba(246,224,94,0.15)]">
              <Link href="/login">
                Get Started for Free
              </Link>
            </Button>
            <Link href="/" className="text-[12px] font-bold tracking-tight text-white/40 hover:text-white transition-colors px-6 py-4 flex items-center gap-2 group">
              Explore the Guide
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </Link>
          </div>
        </div>

        {/* Feature Grid - Inspired by Fumadocs from screenshots */}
        <div className="mt-32 w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="p-10 bg-[#050505] hover:bg-white/[0.02] transition-colors group">
            <div className="w-10 h-10 mb-6 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-[#f6e05e]/30 transition-colors">
              <span className="text-[14px] font-bold text-white/40 group-hover:text-[#f6e05e]">A</span>
            </div>
            <h3 className="text-[14px] font-bold tracking-tight mb-3">AI Native Editing</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">Real-time LaTeX generation and modification with built-in AI intelligence. No more manual syntax debugging.</p>
          </div>
          <div className="p-10 bg-[#050505] hover:bg-white/[0.02] transition-colors group">
            <div className="w-10 h-10 mb-6 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-[#f6e05e]/30 transition-colors">
              <span className="text-[14px] font-bold text-white/40 group-hover:text-[#f6e05e]">C</span>
            </div>
            <h3 className="text-[14px] font-bold tracking-tight mb-3">Cloud Compilation</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">Blazing fast Tectonic-powered PDF compilation. Instant feedback for your most complex documents.</p>
          </div>
          <div className="p-10 bg-[#050505] hover:bg-white/[0.02] transition-colors group">
            <div className="w-10 h-10 mb-6 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-[#f6e05e]/30 transition-colors">
              <span className="text-[14px] font-bold text-white/40 group-hover:text-[#f6e05e]">S</span>
            </div>
            <h3 className="text-[14px] font-bold tracking-tight mb-3">Streamlined Sync</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">Real-time collaboration and project management that feels as fast as your thoughts.</p>
          </div>
          <div className="p-10 bg-[#050505] hover:bg-white/[0.02] transition-colors group">
            <div className="w-10 h-10 mb-6 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-[#f6e05e]/30 transition-colors">
              <span className="text-[14px] font-bold text-white/40 group-hover:text-[#f6e05e]">P</span>
            </div>
            <h3 className="text-[14px] font-bold tracking-tight mb-3">Premium Export</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">High-fidelity production ready output. Optimized for journals, thesis work, and elegant reports.</p>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full p-8 flex justify-between items-end pointer-events-none opacity-20">
        <div className="text-[9px] uppercase tracking-[0.2em]">© 2026 Jules Research</div>
        <div className="flex gap-4">
           {/* Subtle GitHub link if needed, but keeping it empty for ultra-minimalism */}
        </div>
      </footer>
    </div>
  )
}

async function getGitHubStars() {
  const response = await fetch('https://api.github.com/repos/shelwinsunga/jules', {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_API_KEY}`,
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.stargazers_count;
}
