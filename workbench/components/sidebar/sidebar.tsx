'use client'

import React, { useState } from 'react'
import FileTree from './file-tree'
import { Input } from '@/components/ui/input'
import { Search, Settings, PanelLeft, Files, GitGraph, Command } from 'lucide-react'
import Link from 'next/link'
import Profile from '@/components/profile/profile'
import { useProject } from '@/contexts/ProjectContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import LoadingSideNav from '@/components/nav/loading-side-nav'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  className?: string
  width?: number
  onToggle?: () => void
  isCollapsed?: boolean 
}

type SidebarView = 'explorer' | 'search' | 'git' | 'settings'

export function Sidebar({ className, onToggle, isCollapsed = false }: SidebarProps) {
  const { project, isProjectLoading, projectId } = useProject()
  const [activeView, setActiveView] = useState<SidebarView>('explorer')
  const [query, setQuery] = useState('')

  if (isProjectLoading) {
    return <LoadingSideNav />
  }

  const projectTitle = project?.title || 'Untitled Project'
  const projectInitials = projectTitle
    .split(' ')
    .map((word: string) => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'UP'

  // If collapsed, we typically still show the Activity Bar (VS Code style). 
  // But if the user wants "closed" to mean fully gone, that's usually handled by the parent layout.
  // Assuming 'isCollapsed' means "Side Panel is hidden", but "Activity Bar" might stay?
  // The user prompt: "toggle icon is also responsible for opening and closing the sidebar".
  // This implies the toggle icon should be visible even when "closed". 
  // I will implement: 
  // - Activity Bar always visible (unless parent hides it).
  // - Side Panel visible only when !isCollapsed.

  return (
    <div className={cn("h-full flex flex-row bg-[#09090b] text-sm select-none font-sans", className)}>
      
      {/* Activity Bar */}
      <div className="w-12 shrink-0 flex flex-col items-center py-3 border-r border-[#1F1F1F] bg-[#09090b] z-20">
         {/* Toggle / specific branding */}
         <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className={cn(
                "h-9 w-9 mb-4 rounded-md transition-colors text-[#858585] hover:text-[#CCCCCC]",
                isCollapsed && "text-[#CCCCCC]" // Highlight when it's the only interaction point
            )}
            title="Toggle Sidebar"
         >
           <PanelLeft className="w-5 h-5" />
         </Button>

         <div className="flex flex-col gap-2 w-full px-2">
            <ActivityBarItem 
                icon={Files} 
                label="Explorer" 
                isActive={activeView === 'explorer' && !isCollapsed} 
                onClick={() => {
                    setActiveView('explorer')
                    if (isCollapsed && onToggle) onToggle()
                }} 
            />
            <ActivityBarItem 
                icon={Search} 
                label="Search" 
                isActive={activeView === 'search' && !isCollapsed} 
                onClick={() => {
                    setActiveView('search')
                    if (isCollapsed && onToggle) onToggle()
                }} 
            />
            <ActivityBarItem 
                icon={GitGraph} 
                label="Source Control" 
                isActive={activeView === 'git' && !isCollapsed} 
                onClick={() => {
                    setActiveView('git')
                    if (isCollapsed && onToggle) onToggle()
                }} 
            />
         </div>

         <div className="mt-auto flex flex-col gap-3 w-full px-2 items-center pb-2">
            <ActivityBarItem 
                icon={Settings} 
                label="Settings" 
                isActive={activeView === 'settings'} 
                onClick={() => setActiveView('settings')} 
            />
            {/* Minimal Profile Avatar */}
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400 hover:text-white cursor-pointer transition-colors hover:bg-zinc-700">
               {/* Simplified Profile visual, usually Profile component handles popover */}
               <div className="scale-75 origin-center">
                 <Profile /> 
               </div>
            </div>
         </div>
      </div>

      {/* Side Panel (Collapsible) */}
      {!isCollapsed && (
          <div className="flex-1 flex flex-col min-w-[220px] bg-[#09090b] border-r border-[#1F1F1F]">
             
             {/* Header Area */}
             <div className="h-12 px-4 flex items-center justify-between shrink-0 border-b border-[#1F1F1F]/50">
                <span className="text-[11px] font-bold text-[#CCCCCC] uppercase tracking-wider">
                    {activeView === 'explorer' && 'Explorer'}
                    {activeView === 'search' && 'Search'}
                    {activeView === 'git' && 'Source Control'}
                    {activeView === 'settings' && 'Settings'}
                </span>
                
                {/* Project Context / Actions */}
                <div className="flex items-center gap-1">
                   {/* We can put simple project actions here */}
                </div>
             </div>

             {/* View Content */}
             <div className="flex-1 overflow-hidden flex flex-col">
                {activeView === 'explorer' && (
                    <>
                        {/* Project Header in Explorer */}
                        <div className="px-4 py-3 pb-1">
                             <Link 
                                href="/projects" 
                                className="flex items-center gap-2 group rounded-md -ml-2 px-2 py-1 transition-colors hover:bg-[#2B2D31]"
                            >
                                <div className="w-5 h-5 rounded-[4px] bg-blue-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm">
                                    {projectInitials}
                                </div>
                                <span className="font-medium text-[#CCCCCC] truncate text-[13px] group-hover:text-white transition-colors">
                                    {projectTitle}
                                </span>
                            </Link>
                        </div>
                        
                        {/* Local Search Filter for Files */}
                        <div className="px-4 mb-2 mt-1">
                           <div className="relative group">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5A5A5A] group-focus-within:text-[#007FD4] transition-colors" />
                              <Input 
                                 value={query}
                                 onChange={(e) => setQuery(e.target.value)}
                                 placeholder="Filter files..."
                                 className="h-7 pl-8 bg-[#18181b] border-[#2B2D31] text-[12px] text-[#CCCCCC] focus-visible:ring-0 focus-visible:border-[#007FD4] placeholder:text-[#5A5A5A]"
                              />
                           </div>
                        </div>

                        {/* File Tree */}
                        <div className="flex-1 mt-1">
                             <FileTree projectId={projectId} query={query} />
                        </div>
                    </>
                )}
                
                {activeView === 'search' && (
                    <div className="p-4 text-xs text-[#858585]">
                        Global search not implemented yet.
                    </div>
                )}
                
                {activeView === 'git' && (
                    <div className="p-4 text-xs text-[#858585]">
                        No source control providers registered.
                    </div>
                )}
             </div>
          </div>
      )}

    </div>
  )
}

function ActivityBarItem({ icon: Icon, label, isActive, onClick }: { icon: any, label: string, isActive?: boolean, onClick: () => void }) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <button 
                        onClick={onClick}
                        className={cn(
                            "w-full aspect-square flex items-center justify-center rounded-md transition-all duration-200 relative group",
                            isActive ? "text-white" : "text-[#858585] hover:text-[#CCCCCC]"
                        )}
                    >
                        {isActive && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-white rounded-r-full" />
                        )}
                        <Icon className={cn("w-[22px] h-[22px]", isActive ? "stroke-[2]" : "stroke-[1.5]")} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1F1F1F] text-[#CCCCCC] border-none text-xs px-2 py-1">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
