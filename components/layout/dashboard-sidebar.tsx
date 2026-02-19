'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TooltipProvider } from '@/components/ui/tooltip'
import { User, ChevronDown, SquarePen, Loader2, Settings, Trash2, Users } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { SidebarShell } from '@/components/layout/sidebar-shell'
import Image from 'next/image'
import { startStripeCheckout } from '@/lib/stripe/checkout'
import { startNavJourney } from '@/lib/perf/nav-trace'
import { NewProjectDialog } from '@/components/features/projects/new-project-dialog'
import { getAllProjects } from '@/hooks/data'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { useQuickEditQuota } from '@/hooks/useQuickEditQuota'
import { AiQuotaDisplay } from '@/components/ai-quota-display'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useFrontend } from '@/contexts/FrontendContext'

export default function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isPro } = useFrontend()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { isCollapsed } = useSidebar()
  const { settings } = useDashboardSettings()
  const {
    quota: quickEditQuota,
    isLoading: isQuickEditQuotaLoading,
    error: quickEditQuotaError,
    refresh: refreshQuickEditQuota,
  } = useQuickEditQuota({ autoRefreshMs: 30_000 })
  const { data: projectsData } = getAllProjects(user?.id)
  const projects = projectsData?.projects as Array<{ trashed_at?: string | null }> | undefined
  
  const isProjectsActive = pathname?.startsWith('/projects')
  const isSharedActive = pathname?.startsWith('/shared')
  const isTrashActive = pathname?.startsWith('/trash')
  const isSettingsActive = pathname?.startsWith('/settings')
  const trashedCount = projects?.filter((project) => Boolean(project.trashed_at)).length ?? 0
  const quickEditQuotaUsagePercent =
    quickEditQuota.limit > 0 ? Math.min((quickEditQuota.used / quickEditQuota.limit) * 100, 100) : 0

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  return (
    <>
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
                className={`flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] rounded-sm py-1 hover:bg-[#151619] transition-colors ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-1 min-w-0 flex-1'}`}
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
            <PopoverContent 
              align="start" 
              side="bottom" 
              sideOffset={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="w-56 p-0 bg-[#1C1D1F] border border-white/[0.08] text-white shadow-xl shadow-black/80 rounded-lg overflow-hidden"
            >
              <div className="flex flex-col">
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <div className="text-[12px] font-medium text-white truncate">{user?.email || 'User'}</div>
                  <div className="text-[10px] text-white/50">{isPro ? 'Pro Plan' : 'Free Plan'}</div>
                  <div className="mt-2">
                    <AiQuotaDisplay
                      used={quickEditQuota.used}
                      limit={quickEditQuota.limit}
                      loading={isQuickEditQuotaLoading}
                      error={quickEditQuotaError ? 'Failed to load quota status.' : null}
                      onRefresh={refreshQuickEditQuota}
                      onUpgrade={() => setShowUpgradeModal(true)}
                      showLabel={true}
                      compact={false}
                    />
                  </div>
                </div>
                <div className="p-1">
                  <Link
                    href="/settings/assistant"
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-[#151619] rounded-md text-left w-full transition-colors group mx-0.5 outline-none focus:bg-white/[0.06]"
                  >
                    <span className="text-[12px] text-white/80 group-hover:text-white">AI quota settings</span>
                  </Link>
                  <UpgradeModal
                    trigger={
                      <button className="flex items-center justify-between px-2 py-1.5 hover:bg-[#151619] rounded-md text-left w-full transition-colors group mx-0.5 outline-none focus:bg-white/[0.06]">
                        <span className="text-[12px] text-white/80 group-hover:text-white">
                          Upgrade plan
                        </span>
                      </button>
                    }
                  />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-[#151619] rounded-md text-left w-full transition-colors group mx-0.5 outline-none focus:bg-white/[0.06]"
                  >
                    <span className="text-[12px] text-white/80 group-hover:text-white">Log out</span>
                    <div className="flex items-center gap-1">
                      <kbd className="min-w-[16px] h-4 flex items-center justify-center text-[9px] font-sans text-white/40 bg-white/[0.06] rounded-[3px] px-1">⌘</kbd>
                      <kbd className="min-w-[16px] h-4 flex items-center justify-center text-[9px] font-sans text-white/40 bg-white/[0.06] rounded-[3px] px-1">⇧</kbd>
                      <kbd className="min-w-[16px] h-4 flex items-center justify-center text-[9px] font-sans text-white/40 bg-white/[0.06] rounded-[3px] px-1">Q</kbd>
                    </div>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Right Side Actions - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider delayDuration={0}>
                <NewProjectDialog
                  tooltip={
                    <>
                      <span>Create new doc</span>
                      <kbd className="text-[9px] font-sans text-white/40 bg-white/5 px-1 rounded-[3px] min-w-[16px] h-4 flex items-center justify-center">C</kbd>
                    </>
                  }
                >
                  <button
                    className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#151619] rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    aria-label="New document"
                    onClick={() => {
                      startNavJourney('new_doc_open', { source: 'dashboard_sidebar_new_doc' })
                    }}
                  >
                    <SquarePen className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                  </button>
                </NewProjectDialog>
              </TooltipProvider>
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

          <Link
            href="/shared"
            className={`group flex items-center text-[12px] font-medium
            rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors
            ${isCollapsed ? 'justify-center py-1.5' : 'gap-2 px-2 py-1.5'}
            ${
              isSharedActive
                ? 'bg-[#1E1F22] text-[#E3E4E5]'
                : 'text-[#E3E4E5] hover:bg-[#151619]'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Shared' : undefined}
          >
            <Users
              className={`h-4 w-4 shrink-0 transition-opacity ${
                isSharedActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
              }`}
            />
            {!isCollapsed && <span>Shared</span>}
          </Link>

          <Link
            href="/trash"
            className={`group flex items-center text-[12px] font-medium 
            rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors
            ${isCollapsed ? 'justify-center py-1.5' : 'gap-2 px-2 py-1.5'}
            ${isTrashActive
              ? 'bg-[#1E1F22] text-[#E3E4E5]'
              : 'text-[#E3E4E5] hover:bg-[#151619]'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Trash' : undefined}
          >
            <Trash2
              className={`h-4 w-4 shrink-0 transition-opacity ${
                isTrashActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
              }`}
            />
            {!isCollapsed && (
              <>
                <span>Trash</span>
                {settings.showTrashCountBadge && trashedCount > 0 && (
                  <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                    {trashedCount}
                  </span>
                )}
              </>
            )}
          </Link>
        </nav>

        <div className={`border-t border-white/[0.06] py-3 ${isCollapsed ? 'px-4' : 'px-3'}`}>
          <Link
            href="/settings"
            className={`group flex items-center text-[12px] font-medium 
            rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors
            ${isCollapsed ? 'justify-center py-1.5' : 'gap-2 px-2 py-1.5'}
            ${isSettingsActive
              ? 'bg-[#1E1F22] text-[#E3E4E5]'
              : 'text-[#E3E4E5] hover:bg-[#151619]'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings
              className={`h-4 w-4 shrink-0 transition-opacity ${
                isSettingsActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
              }`}
            />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
    </SidebarShell>
    
    <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </>
  )
}
