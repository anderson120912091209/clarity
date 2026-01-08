'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Files, 
  Search, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  User
} from 'lucide-react'
import { FileExplorer } from './file-explorer'
import { useProject } from '@/contexts/ProjectContext'
import Link from 'next/link'

interface SidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

type View = 'files' | 'search' | 'settings'

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const [activeView, setActiveView] = useState<View>('files')
  const { project } = useProject()

  const projectTitle = project?.title || 'Untitled Project'
  const projectInitials = projectTitle
    .split(' ')
    .map((w: string) => w[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'UP'

  return (
    <div className={cn("h-full flex bg-[#09090b]", className)}>
      {/* Activity Bar */}
      <div className="w-12 bg-transparent flex flex-col items-center py-2 z-10">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className="w-10 h-10 flex items-center justify-center text-[#858585] hover:text-white hover:bg-[#2a2d2e]/50 rounded-md mb-4 transition-colors"
          title="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Views */}
        <div className="flex flex-col gap-1 w-full px-1.5">
          <ActivityButton
            icon={Files}
            label="Explorer"
            active={activeView === 'files' && !isCollapsed}
            onClick={() => {
              setActiveView('files')
              if (isCollapsed && onToggle) onToggle()
            }}
          />
          <ActivityButton
            icon={Search}
            label="Search"
            active={activeView === 'search' && !isCollapsed}
            onClick={() => {
              setActiveView('search')
              if (isCollapsed && onToggle) onToggle()
            }}
          />
          <ActivityButton
            icon={Settings}
            label="Settings"
            active={activeView === 'settings' && !isCollapsed}
            onClick={() => {
              setActiveView('settings')
              if (isCollapsed && onToggle) onToggle()
            }}
          />
        </div>

        {/* Bottom */}
        <div className="mt-auto pb-4">
          <Link href="/projects" className="w-10 h-10 flex items-center justify-center group">
            <div className="w-8 h-8 rounded-full bg-blue-600/80 group-hover:bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white transition-all transform group-hover:scale-110 shadow-lg">
              {projectInitials}
            </div>
          </Link>
        </div>
      </div>

      {/* Content Panel */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-w-[200px] bg-transparent">
          {/* Header */}
          <div className="h-10 px-4 flex items-center">
            <span className="text-[11px] font-bold text-[#555] uppercase tracking-[0.1em]">
              {activeView === 'files' && 'Explorer'}
              {activeView === 'search' && 'Search'}
              {activeView === 'settings' && 'Settings'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'files' && <FileExplorer />}
            {activeView === 'search' && (
              <div className="p-4 text-xs text-[#858585]">
                Search not implemented yet
              </div>
            )}
            {activeView === 'settings' && (
              <div className="p-4 text-xs text-[#858585]">
                Settings not implemented yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-10 flex items-center justify-center rounded-md relative transition-all",
        active 
          ? "text-white" 
          : "text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/30"
      )}
      title={label}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
    </button>
  )
}

