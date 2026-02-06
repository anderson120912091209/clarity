'use client'

import Link from 'next/link'
import { AuthButton } from '@/components/landing/components/auth-button'

export function Navbar({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="fixed top-0 w-full z-50 px-6 py-4 bg-[#0c0c0e]">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
           <img 
              src="/landing/claritylogopurple.png" 
              alt="Clarity" 
              className="h-8 w-auto"
           />
        </Link>
        
        {!minimal && (
          <>
            <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-400">
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="#ai" className="hover:text-white transition-colors">Templates</Link>
              <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-white transition-colors">Blogs</Link>
              <Link href="#" className="hover:text-white transition-colors">Support</Link>
            </nav>

            <div className="flex items-center gap-4">
              <AuthButton />
            </div>
          </>
        )}
      </div>
    </header>
  )
}
