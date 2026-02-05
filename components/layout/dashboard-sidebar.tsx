'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Search, Pencil, ChevronDown } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { SidebarShell } from '@/components/layout/sidebar-shell'
import Image from 'next/image'

export default function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = db.useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isCollapsed } = useSidebar()
  
  const isProjectsActive = pathname?.startsWith('/projects')

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  return (
    <SidebarShell
      logoHref="/"
      isCollapsed={isCollapsed}
      isMobileMenuOpen={isMobileMenuOpen}
      onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
    >

        {/* Top Header with User Profile */}
        <div className={`h-12 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
          {/* User Profile with Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] rounded-sm py-1 hover:bg-white/5 transition-colors ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-1 min-w-0 flex-1'}`}
                aria-label="User menu"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] 
                font-bold text-white ring-1 ring-white/10 shrink-0" style={{ backgroundColor: '#6D78E7' }}>
                  {user?.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-[12px] font-medium text-white/90 group-hover:text-white transition-colors truncate">{user?.email || 'User'}</span>
                    <ChevronDown className="h-3 w-3 text-white/50 group-hover:text-white/70 transition-colors shrink-0" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="right" className="w-56 p-1 bg-[#090909] border-white/10 text-white shadow-2xl shadow-black/50 rounded-sm">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-red-500/10 rounded-sm text-left w-full transition-colors group"
                >
                  <span className="text-[12px] text-white/80 group-hover:text-white">Log out</span>
                  <div className="flex items-center gap-0.5">
                    <kbd className="px-1 py-0.5 text-[9px] font-mono text-white/40 border border-white/10 rounded">⌘</kbd>
                    <kbd className="px-1 py-0.5 text-[9px] font-mono text-white/40 border border-white/10 rounded">⇧</kbd>
                    <kbd className="px-1 py-0.5 text-[9px] font-mono text-white/40 border border-white/10 rounded">Q</kbd>
                  </div>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Right Side Actions - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <Link
                href="/new"
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="New document"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 ${isCollapsed ? 'px-4' : 'px-3'}`}>
          <Link
            href="/projects"
            className={`group flex items-center text-[12px] font-medium 
            rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors
            ${isCollapsed ? 'justify-center py-1' : 'gap-2 px-2 py-1.5'}
            ${isProjectsActive 
              ? 'bg-[#1E1F22] text-[#E3E4E5]' 
              : 'text-[#E3E4E5] hover:bg-[#151619]'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Projects' : undefined}
          >
            <Image
              src="/sidebar/box-projects.svg"
              alt="Projects"
              width={16}
              height={16}
              className={`w-4 h-4 brightness-0 invert transition-opacity shrink-0
              ${isProjectsActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}
              `}
            />
            {!isCollapsed && <span>Projects</span>}
          </Link>
        </nav>
    </SidebarShell>
  )
}
