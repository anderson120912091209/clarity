'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIDEBAR_BG_CLASS = 'bg-[#090909]'
const SIDEBAR_WIDTH_CLASS = 'w-48'

interface SidebarShellProps {
  logoHref: string
  children: React.ReactNode
  isCollapsed: boolean
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onCloseMobileMenu: () => void
  className?: string
  logoSrc?: string
  logoAlt?: string
}

export function SidebarShell({
  logoHref,
  children,
  isCollapsed,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  className,
  logoSrc = '/logos/claritylogogreen.svg',
  logoAlt = 'Clarity'
}: SidebarShellProps) {
  return (
    <>
      {/* Mobile Header */}
      <div
        className={cn(
          "lg:hidden fixed top-0 left-0 right-0 z-50 h-12 border-b border-white/[0.06] flex items-center justify-between px-4",
          SIDEBAR_BG_CLASS
        )}
      >
        <Link href={logoHref} className="flex items-center gap-2">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={20}
            height={17}
            className="h-4 w-auto"
          />
        </Link>
        <button
          onClick={onToggleMobileMenu}
          className="w-8 h-8 rounded-[2px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen flex flex-col z-40 transition-all duration-300 ease-out pt-12 lg:pt-3",
          SIDEBAR_BG_CLASS,
          isCollapsed ? 'w-0 overflow-hidden' : SIDEBAR_WIDTH_CLASS,
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {children}
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onCloseMobileMenu}
        />
      )}
    </>
  )
}
