'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Menu, X, Search, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { useSidebar } from '@/contexts/SidebarContext'

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
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-[#090909] 
      border-b border-white/[0.08] flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logos/claritylogogreen.svg"
            alt="Clarity"
            width={20}
            height={17}
            className="h-4 w-auto"
          />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-8 h-8 rounded-[2px] flex items-center justify-center 
          text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-[#090909] flex flex-col z-40
          transition-all duration-300 ease-out pt-12 lg:pt-3
          ${isCollapsed ? 'w-0 overflow-hidden' : 'w-48'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
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
                <button className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors group text-left w-full">
                  <span className="text-[12px] text-white group-hover:text-white">Settings</span>
                  <span className="text-[11px] text-white/40 font-mono">G then S</span>
                </button>
                <button className="px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors text-left">
                  <span className="text-[12px] text-white">Invite and manage members</span>
                </button>
                <div className="h-[1px] bg-white/5 my-1" />
                <button className="px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors text-left">
                  <span className="text-[12px] text-white">Download desktop app</span>
                </button>
                <div className="h-[1px] bg-white/5 my-1" />
                <button className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors group text-left w-full">
                  <span className="text-[12px] text-white group-hover:text-white">Switch workspace</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-white/40 font-mono">O then W</span>
                    <ChevronRight className="w-3 h-3 text-white/40" />
                  </div>
                </button>
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
