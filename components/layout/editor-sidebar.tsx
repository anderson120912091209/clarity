'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { User, Search, Pencil, ChevronDown, ArrowLeft, Settings, ChevronRight, Palette, MousePointer2, SquarePen } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { useProject } from '@/contexts/ProjectContext'
import { FileTree } from '@/components/file-tree/file-tree'
import { tx } from '@instantdb/react'
import { SidebarShell } from '@/components/layout/sidebar-shell'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { EditorSyntaxTheme } from '@/components/editor/types'
import { EDITOR_SYNTAX_THEME_OPTIONS } from '@/components/editor/syntax/themes/catalog'
import {
  DEFAULT_PDF_BACKGROUND_THEME,
  PDF_BACKGROUND_THEME_CHANGE_EVENT,
  PDF_BACKGROUND_THEME_OPTIONS,
  getPdfBackgroundThemeStorageKey,
  isPdfBackgroundThemeKey,
  resolvePdfBackgroundTheme,
  type PdfBackgroundThemeKey,
} from '@/lib/constants/pdf-background-themes'

interface EditorSidebarProps {
  syntaxTheme: EditorSyntaxTheme
  onSyntaxThemeChange: (theme: EditorSyntaxTheme) => void
}

export default function EditorSidebar({ syntaxTheme, onSyntaxThemeChange }: EditorSidebarProps) {
  const router = useRouter()
  const { user } = db.useAuth()
  const { settings } = useDashboardSettings()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<'root' | 'theme' | 'preview'>('root')
  const [localPdfBackgroundTheme, setLocalPdfBackgroundTheme] = useState<PdfBackgroundThemeKey>(DEFAULT_PDF_BACKGROUND_THEME)
  const { isCollapsed } = useSidebar()
  const { projectId, project, files, currentlyOpen } = useProject()
  const isPdfCaretNavigationEnabled = project?.isPdfCaretNavigationEnabled ?? true
  const pdfBackgroundTheme = localPdfBackgroundTheme
  const selectedPdfBackgroundTheme = resolvePdfBackgroundTheme(pdfBackgroundTheme)

  useEffect(() => {
    const projectTheme = project?.pdfBackgroundTheme
    if (isPdfBackgroundThemeKey(projectTheme)) {
      setLocalPdfBackgroundTheme(projectTheme)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getPdfBackgroundThemeStorageKey(projectId), projectTheme)
      }
      return
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(getPdfBackgroundThemeStorageKey(projectId))
      if (isPdfBackgroundThemeKey(stored)) {
        setLocalPdfBackgroundTheme(stored)
        return
      }
    }

    setLocalPdfBackgroundTheme(settings.defaultPdfBackgroundTheme)
  }, [project?.pdfBackgroundTheme, projectId, settings.defaultPdfBackgroundTheme])

  const handleSignOut = () => {
    db.auth.signOut()
    router.push('/')
  }

  const handlePdfCaretNavigationChange = (enabled: boolean) => {
    db.transact([
      tx.projects[projectId].update({
        isPdfCaretNavigationEnabled: enabled,
      }),
    ])
  }

  const handlePdfBackgroundThemeChange = (theme: PdfBackgroundThemeKey) => {
    setLocalPdfBackgroundTheme(theme)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getPdfBackgroundThemeStorageKey(projectId), theme)
      window.dispatchEvent(
        new CustomEvent(PDF_BACKGROUND_THEME_CHANGE_EVENT, {
          detail: { projectId, theme },
        })
      )
    }

    db.transact([
      tx.projects[projectId].update({
        pdfBackgroundTheme: theme,
      }),
    ])
  }

  return (
    <SidebarShell
      logoHref="/projects"
      isCollapsed={isCollapsed}
      isMobileMenuOpen={isMobileMenuOpen}
      onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
    >

        {/* Top Header with User Profile - Same as Dashboard */}
        <div className={`h-12 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} border-b border-white/[0.06]`}>
          {/* User Profile with Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0D] rounded-md py-1 hover:bg-[#151619] transition-colors ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-1.5 min-w-0 flex-1'}`}
                aria-label="User menu"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] 
                font-bold text-white ring-1 ring-white/10 shrink-0" style={{ backgroundColor: '#6D78E7' }}>
                  {user?.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-[12px] font-medium text-white/85 group-hover:text-white transition-colors truncate">{user?.email || 'User'}</span>
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
                  <div className="text-[10px] text-white/50">Free Plan</div>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-[#151619] rounded-md text-left w-full transition-colors group outline-none focus:bg-white/[0.06]"
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/new"
                      className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#151619] rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      aria-label="New document"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <SquarePen className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-[#1E1F22] text-white border border-white/[0.08] text-[11px] px-2 py-1 flex items-center gap-1.5 align-center shadow-lg">
                    <span>Create new doc</span>
                    <kbd className="text-[9px] font-sans text-white/40 bg-white/5 px-1 rounded-[3px] min-w-[16px] h-4 flex items-center justify-center">C</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Navigation - Back to Projects */}
        <nav className={`py-3 space-y-1 ${isCollapsed ? 'px-4' : 'px-3'}`}>
          <Link
            href="/projects"
            className={`group flex items-center text-[12px] font-medium 
            rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors
            ${isCollapsed ? 'justify-center py-1' : 'gap-2 px-2 py-1.5'}
            text-white/80 hover:text-white hover:bg-[#151619]`}
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Back to Projects' : undefined}
          >
            <ArrowLeft className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
            {!isCollapsed && <span>Back to Projects</span>}
          </Link>
        </nav>

        {/* Files Section */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File Tree */}
            <div className="flex-1 overflow-auto px-2 pb-3">
              <FileTree 
                files={files || []} 
                projectId={projectId} 
                userId={user?.id || ''}
                onOpenFile={(file: { id: string }) => {
                  db.transact([
                    tx.files[file.id].update({ isOpen: true }),
                    tx.projects[projectId].update({ activeFileId: file.id })
                  ])
                }}
                currentlyOpenId={currentlyOpen?.id}
              />
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div className="px-3 py-2">
            <Popover
              open={isSettingsOpen}
              onOpenChange={(open) => {
                setIsSettingsOpen(open)
                if (!open) setSettingsView('root')
              }}
            >
              <PopoverTrigger asChild>
                <button
                  className="w-full h-8 rounded-md hover:bg-[#151619] transition-colors flex items-center gap-2 px-2 text-white/70 hover:text-white"
                  aria-label="Open settings"
                >
                  <Settings className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[12px] font-medium">Settings</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="right"
                className="w-52 p-2 bg-[#1C1D1F] border-white/10 text-white shadow-2xl shadow-black/50 rounded-md"
              >
                {settingsView === 'root' ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setSettingsView('theme')}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#151619] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-[11px] text-white/80">Theme</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                    </button>
                    <button
                      onClick={() => setSettingsView('preview')}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#151619] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MousePointer2 className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-[11px] text-white/80">PDF Navigation</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                ) : settingsView === 'theme' ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSettingsView('root')}
                        className="w-6 h-6 rounded-md hover:bg-[#151619] flex items-center justify-center"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <div className="text-[12px] font-medium text-white/85">Theme</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-white/60">Syntax theme</span>
                      <div className="flex items-center gap-1 border border-white/10 bg-zinc-950/40 rounded-md p-0.5">
                        {EDITOR_SYNTAX_THEME_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={syntaxTheme === option.value ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-5 px-2 text-[10px] font-medium"
                            onClick={() => onSyntaxThemeChange(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[12px] text-white/60">PDF background</span>
                      <div className="grid grid-cols-5 gap-1.5 rounded-md border border-white/10 bg-zinc-950/40 p-1.5">
                        {PDF_BACKGROUND_THEME_OPTIONS.map((option) => {
                          const isActive = pdfBackgroundTheme === option.key
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => handlePdfBackgroundThemeChange(option.key)}
                              aria-label={`Set PDF background to ${option.label}`}
                              title={option.label}
                              className={`relative h-6 w-full rounded-sm border transition ${isActive ? 'border-white/50 ring-1 ring-white/35' : 'border-white/10 hover:border-white/30'}`}
                            >
                              <span
                                className="absolute inset-0 rounded-[inherit]"
                                style={{ backgroundColor: option.panelColor }}
                              />
                              <span
                                className="absolute inset-0 rounded-[inherit]"
                                style={{
                                  backgroundImage: `radial-gradient(${option.dotColor} ${option.dotSize}px, transparent ${option.dotSize}px)`,
                                  backgroundSize: `${option.dotSpacing}px ${option.dotSpacing}px`,
                                }}
                              />
                            </button>
                          )
                        })}
                      </div>
                      <div className="text-[10px] text-white/45">{selectedPdfBackgroundTheme.label}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSettingsView('root')}
                        className="w-6 h-6 rounded-md hover:bg-[#151619] flex items-center justify-center"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <div className="text-[12px] font-medium text-white/85">PDF Navigation</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950/40 px-2 py-2">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-white/85">Enable PDF navigation</div>
                        <div className="text-[10px] text-white/50">Uses SyncTeX when available, falls back to ratio mapping, and enables PDF click-to-source navigation</div>
                      </div>
                      <Switch
                        checked={isPdfCaretNavigationEnabled}
                        onCheckedChange={handlePdfCaretNavigationChange}
                        aria-label="Toggle PDF navigation from caret"
                      />
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}
    </SidebarShell>
  )
}
