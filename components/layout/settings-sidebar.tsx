'use client'

import { type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Building2, ChevronLeft, Key, LayoutGrid, Plug, Settings, Shield, Sparkles, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTION_ITEMS: Array<{
  href: string
  icon: ElementType
  label: string
  exact?: boolean
}> = [
  { href: '/settings', icon: Settings, label: 'Preferences', exact: true },
  { href: '/settings/workspace', icon: Building2, label: 'Workspace' },
  { href: '/settings/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/settings/editor', icon: Sparkles, label: 'Editor defaults' },
  { href: '/settings/assistant', icon: Bot, label: 'AI assistant' },
  { href: '/settings/ai-providers', icon: Key, label: 'AI Providers' },
  { href: '/settings/mcp', icon: Plug, label: 'MCP / API' },
  { href: '/settings/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings/safety', icon: Shield, label: 'Safety' },
]

function isPathActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface SettingsSidebarItemProps {
  icon: ElementType
  label: string
  href: string
  isActive: boolean
}

function SettingsSidebarItem({ icon: Icon, label, href, isActive }: SettingsSidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20',
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

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col bg-[#090909] p-3">
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
        {SECTION_ITEMS.map((item) => (
          <SettingsSidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isPathActive(pathname, item.href, item.exact)}
          />
        ))}
      </nav>
    </div>
  )
}
