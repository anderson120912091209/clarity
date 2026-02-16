import { Terminal } from 'lucide-react'

export function MobileOverlay() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0e] px-6 text-center md:hidden">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <img 
          src="/landing/claritylogopurple.png" 
          alt="Clarity" 
          className="h-8 w-auto"
        />
      </div>
      
      <h1 className="mb-4 text-2xl font-semibold text-white">
        Desktop Experience Recommended
      </h1>
      
      <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
        For the best experience writing and collaborating on your research, please open Clarity on a computer.
      </p>

      <div className="mt-12 flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[11px] font-medium text-zinc-500 ring-1 ring-white/10">
        <Terminal className="h-3 w-3" />
        <span>Designed for precision</span>
      </div>
    </div>
  )
}
