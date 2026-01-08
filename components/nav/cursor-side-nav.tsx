'use client'

import React, { useState } from 'react'
import FileTree from '@/components/file-tree/file-tree'
import { Input } from '@/components/ui/input'
import { Search, Settings, PanelLeft, MoreHorizontal, Sparkles, Command } from 'lucide-react'
import Link from 'next/link'
import Profile from '@/components/profile/profile'
import LoadingSideNav from '@/components/nav/loading-side-nav'
import { useProject } from '@/contexts/ProjectContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function CursorSideNav() {
  const { project, isProjectLoading, projectId } = useProject()
  const [query, setQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  if (isProjectLoading) {
    return <LoadingSideNav />
  }

  const projectTitle = project?.title || 'Untitled Project'
  const projectInitials = projectTitle
    .split(' ')
    .map((word: string) => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'UP'

  return (
    <div className="h-full flex flex-col bg-[#09090b] border-r border-[#1F1F1F] text-sm select-none font-sans">
      {/* Header - VS Code / Cursor Style Project Selector */}
      <div className="h-10 px-3 flex items-center justify-between shrink-0 mb-1">
        <Link 
          href="/projects" 
          className="flex items-center gap-2 overflow-hidden group rounded-md px-2 py-1.5 -ml-2 transition-colors hover:bg-[#2B2D31]"
        >
          <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm">
            {projectInitials}
          </div>
          <span className="font-medium text-[#CCCCCC] truncate text-[13px] group-hover:text-white transition-colors">
            {projectTitle}
          </span>
        </Link>
        
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-[#858585] hover:text-[#CCCCCC] hover:bg-[#2B2D31] rounded-sm"
        >
           <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Modern Search Input */}
      <div className="px-3 mb-2 shrink-0">
         <div className={cn(
           "group relative transition-all duration-200 rounded-md overflow-hidden bg-[#18181b] border border-[#27272a] focus-within:border-[#007FD4] focus-within:bg-[#1f1f22]" // Blue border on focus
         )}>
           <Search className={cn(
             "absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
             isSearchFocused ? "text-[#007FD4]" : "text-[#858585]"
           )} />
           <Input
             placeholder="Search..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             onFocus={() => setIsSearchFocused(true)}
             onBlur={() => setIsSearchFocused(false)}
             className="h-7 pl-8 pr-2 text-[12px] border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-[#6e6e6e] text-[#CCCCCC]"
           />
         </div>
      </div>

      {/* Explorer Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* The 'Explorer' header logic is moved into FileTree for better button integration, 
            or we can keep the label here. Cursor puts 'EXPLORER' as a collapsible header. 
            We'll let FileTree handle the 'EXPLORER' header row to include actions. 
        */}
        <FileTree projectId={projectId} query={query} />
      </div>

      {/* Footer / User Profile */}
      <div className="p-2 border-t border-[#1F1F1F] bg-[#09090b]">
        <Profile />
      </div>
    </div>
  )
}
