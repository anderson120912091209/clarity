'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LogOut, User, Menu, X } from 'lucide-react'
import { db } from '@/lib/constants'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DashboardSidebar() {
  const router = useRouter()
  const { user } = db.useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-[#0A0A0A] border-b border-white/[0.08] flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white rounded-[1px]" />
          <span className="text-[13px] font-bold tracking-tight text-white/90">Clarity</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-8 h-8 rounded-[2px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-48 bg-[#0A0A0A] flex flex-col z-40
          transition-transform duration-200 lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-4 mt-12 lg:mt-0">
          <Link href="/" className="flex items-center gap-2 group outline-none">
            <div className="h-4 w-4 bg-white rounded-[1px] group-focus-visible:ring-2 group-focus-visible:ring-indigo-500" />
            <span className="text-[13px] font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
              Clarity
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/projects"
            className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-medium text-white/90 bg-white/[0.08] rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Projects
          </Link>
        </nav>

        {/* User Menu */}
        <div className="p-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] hover:bg-white/[0.05] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="User menu"
              >
                <div className="w-6 h-6 rounded-[2px] bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300 ring-1 ring-white/10">
                  {user?.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[11px] font-medium text-zinc-400 truncate">{user?.email}</div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="right" className="w-56 p-1 bg-[#0A0A0A] border-white/10 text-zinc-400 shadow-2xl shadow-black/50 rounded-sm">
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-2 text-xs font-medium text-zinc-500 border-b border-white/5 mb-1 truncate">
                  {user?.email}
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors group">
                  <span className="text-[12px] group-hover:text-zinc-200">Theme</span>
                  <div className="scale-75 origin-right">
                    <ModeToggle />
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-red-500/10 rounded-sm text-[12px] text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
