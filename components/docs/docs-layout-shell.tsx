'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { DocsSidebar } from '@/components/docs/docs-sidebar'

export function DocsLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0e0e12] text-zinc-300 antialiased">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-white/[0.04] bg-[#0e0e12]/90 backdrop-blur-md px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <img src="/landing/claritylogopurple.png" alt="Clarity" className="h-5 w-auto" />
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex lg:w-[260px] xl:w-[272px] shrink-0 flex-col sticky top-0 h-screen bg-[#0a0a0e] pt-5 pb-2 overflow-y-auto">
          <DocsSidebar />
        </aside>

        {/* Sidebar — mobile overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-[272px] flex flex-col bg-[#0a0a0e] pt-5 pb-2 overflow-y-auto lg:hidden shadow-2xl shadow-black/40">
              <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Main content — centered */}
        <main className="flex-1 min-w-0 flex justify-center">
          <div className="w-full max-w-[980px] px-4 sm:px-6 md:px-10 lg:px-14 py-6 sm:py-10 lg:py-14">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
