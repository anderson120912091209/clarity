'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LogOut, Settings } from 'lucide-react'
import { db } from '@/lib/constants'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useRouter } from 'next/navigation'

export default function ProjectNav() {
  const router = useRouter()
  const { user } = db.useAuth()

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-[12px] uppercase font-bold tracking-[0.2em] text-white opacity-90 hover:opacity-100 transition-opacity">
            Jules
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              className="text-[13px] font-medium text-white/60 hover:text-white transition-colors" 
              href="/projects"
            >
              Projects
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-[10px] font-bold text-white/50">
                   {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2 mr-4 bg-[#0A0A0A] border-white/10 text-zinc-400">
              <div className="flex flex-col gap-1">
                <div className="px-3 py-2 text-xs font-medium text-zinc-500 border-b border-white/5 mb-1">
                  {user?.email}
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors">
                  <span className="text-[13px]">Theme</span>
                  <ModeToggle />
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-white/5 rounded-sm text-[13px] text-red-400/80 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}
