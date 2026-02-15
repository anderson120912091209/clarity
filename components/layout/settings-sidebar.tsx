'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Building2, ChevronLeft, LayoutGrid, Settings, Shield, Sparkles } from 'lucide-react'
import { db } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SettingsSidebarItemProps {
  href: string
  icon: ElementType
  label: string
  isActive?: boolean
  onClick?: (e: React.MouseEvent) => void
}

function SettingsSidebarItem({ href, icon: Icon, label, isActive, onClick }: SettingsSidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
      )}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-white')} />
      <span>{label}</span>
    </Link>
  )
}

function getInitialsFromEmail(email?: string | null): string {
  if (!email) return 'U'
  const local = email.split('@')[0] ?? ''
  const tokens = local.split(/[._-]+/).filter(Boolean)
  if (!tokens.length) return local.slice(0, 1).toUpperCase() || 'U'
  return tokens
    .slice(0, 2)
    .map((token) => token.slice(0, 1).toUpperCase())
    .join('')
}

export function SettingsSidebar() {
  const pathname = usePathname()
  const { user } = db.useAuth()
  const [activeSection, setActiveSection] = useState<string>('')

  // Scroll spy logic
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    const scrollContainer = document.getElementById('settings-scroll-container')
    if (!scrollContainer) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Sort visible entries by how much they intersect
        // We trigger if any part is visible, but we want the "most visible" 
        // or the one at the top to be the active one.
        // A simple heuristic: if multiple are intersecting, pick the one with largest intersectionRatio
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visibleSections.length > 0) {
          // If we are at the very top, 'workspace' might be partially visible but arguably 'Preferences' (top) is the state.
          // However, 'Preferences' isn't a section ID. We map the top to empty string or 'workspace' if workspace is top.
          // Let's assume the first section is 'workspace'.
          setActiveSection(visibleSections[0].target.id)
        }
      },
      {
        root: scrollContainer,
        rootMargin: '-10% 0px -60% 0px', // Active when it hits top part of view
        threshold: [0, 0.1, 0.5, 1],
      }
    )

    const sections = ['workspace', 'dashboard', 'editor', 'assistant', 'safety']
    sections.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    const [, hash] = href.split('#')
    
    // If no hash, scroll to top
    if (!hash) {
       const scrollContainer = document.getElementById('settings-scroll-container')
       if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
       }
       setActiveSection('') 
       return
    }

    const target = document.getElementById(hash)
    if (target) {
      e.preventDefault()
    //   target.scrollIntoView({ behavior: 'smooth', block: 'start' }) // Sometimes block start covers header
      // Using scrollIntoView usually works well if there are no fixed headers covering it.
      // We have padding. Let's try it.
      target.scrollIntoView({ behavior: 'smooth', block: 'center' }) // Center might be better? No, start.
        
      // Manually scrolling:
      // const scrollContainer = document.getElementById('settings-scroll-container')
      // if (scrollContainer) {
      //   const top = target.offsetTop
      //   scrollContainer.scrollTo({ top: top - 20, behavior: 'smooth' }) // -20 for padding
      // }
      
      // Let's stick to scrollIntoView for now but maybe 'start' with some margin if needed.
      // Actually standard scrollIntoView is easiest.
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Update URL without jump/reload
      window.history.pushState(null, '', href)
      setActiveSection(hash)
    }
  }

  const items = useMemo(
    () => [
      { href: '/settings', icon: Settings, label: 'Preferences', id: '' },
      { href: '/settings#workspace', icon: Building2, label: 'Workspace', id: 'workspace' },
      { href: '/settings#dashboard', icon: LayoutGrid, label: 'Dashboard', id: 'dashboard' },
      { href: '/settings#editor', icon: Sparkles, label: 'Editor defaults', id: 'editor' },
      { href: '/settings#assistant', icon: Bot, label: 'AI assistant', id: 'assistant' },
      { href: '/settings#safety', icon: Shield, label: 'Safety', id: 'safety' },
    ],
    []
  )

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0F0F10] p-3">
      <div className="mb-6">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to app
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5">
        {items.map((item) => {
           // Active if:
           // 1. activeSection matches item.id
           // 2. Or if activeSection is empty (top) and item.id is 'workspace' (first section) or ''?
           // Actually, 'Preferences' is a general header. 
           // If we scroll down to 'workspace', 'Preferences' should clearly NOT be active?
           // The user said: "if i click workspace settings from general prefernces, the sidebar still shows "preferences hovered state" which is weird"
           // This implies mutually exclusive states.
           
           const isActive = activeSection === item.id || (activeSection === '' && item.id === '')
           
           return (
            <SettingsSidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive}
              onClick={(e) => handleLinkClick(e, item.href)}
            />
          )
        })}
      </nav>

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
            {getInitialsFromEmail(user?.email)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-white">
              {user?.email?.split('@')[0] || 'User'}
            </span>
            <span className="truncate text-[11px] text-zinc-500">{user?.email || 'No email'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
