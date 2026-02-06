'use client'

import React from 'react'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Search, Pencil, ChevronDown, ArrowLeft, Settings, ChevronRight, Palette, MousePointer2 } from 'lucide-react'
import { db } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useProject } from '@/contexts/ProjectContext'
import { FileTree } from '@/components/file-tree/file-tree'
import { tx } from '@instantdb/react'
import { SidebarShell } from '@/components/layout/sidebar-shell'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { EditorSyntaxTheme } from '@/components/editor/types'

interface EditorSidebarProps {
  syntaxTheme: EditorSyntaxTheme
  onSyntaxThemeChange: (theme: EditorSyntaxTheme) => void
}

export default function EditorSidebar({ syntaxTheme, onSyntaxThemeChange }: EditorSidebarProps) {
  const router = useRouter()
  const { user } = db.useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<'root' | 'theme' | 'preview'>('root')
  const { isCollapsed } = useSidebar()
  const { projectId, project, files, currentlyOpen } = useProject()
  const isPdfCaretNavigationEnabled = project?.isPdfCaretNavigationEnabled ?? true

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
                className={`flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0D] rounded-md py-1 hover:bg-white/5 transition-colors ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-1.5 min-w-0 flex-1'}`}
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
            <PopoverContent align="start" side="right" className="w-56 p-1 bg-[#0A0B0D] border-white/10 text-white shadow-2xl shadow-black/50 rounded-md">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors group text-left w-full"
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
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <Link
                href="/new"
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="New document"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Pencil className="w-4 h-4" />
              </Link>
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
            text-white/80 hover:text-white hover:bg-white/5`}
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
                  className="w-full h-8 rounded-md hover:bg-white/5 transition-colors flex items-center gap-2 px-2 text-white/70 hover:text-white"
                  aria-label="Open settings"
                >
                  <Settings className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[12px] font-medium">Settings</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="right"
                className="w-52 p-2 bg-[#0A0B0D] border-white/10 text-white shadow-2xl shadow-black/50 rounded-md"
              >
                {settingsView === 'root' ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setSettingsView('theme')}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-[11px] text-white/80">Theme</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                    </button>
                    <button
                      onClick={() => setSettingsView('preview')}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
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
                        className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <div className="text-[12px] font-medium text-white/85">Theme</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-white/60">Syntax theme</span>
                      <div className="flex items-center gap-1 border border-white/10 bg-zinc-950/40 rounded-md p-0.5">
                        <Button
                          type="button"
                          variant={syntaxTheme === 'default' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-5 px-2 text-[10px] font-medium"
                          onClick={() => onSyntaxThemeChange('default')}
                        >
                          Default
                        </Button>
                        <Button
                          type="button"
                          variant={syntaxTheme === 'shiki' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-5 px-2 text-[10px] font-medium"
                          onClick={() => onSyntaxThemeChange('shiki')}
                        >
                          Shiki
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSettingsView('root')}
                        className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      <div className="text-[12px] font-medium text-white/85">PDF Navigation</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950/40 px-2 py-2">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-white/85">Navigate PDF from caret</div>
                        <div className="text-[10px] text-white/50">Scroll preview when your cursor moves in editor</div>
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
