'use client'

import React, { useState } from 'react'
import FileTree from '@/components/file-tree/file-tree'
import { Input } from '@/components/ui/input'
import { Search, Settings, FolderOpen } from 'lucide-react'
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

  const projectTitle = project?.title || 'Untitled'

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--muted)/0.2)] border-r border-border/50">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <Link 
          href="/projects" 
          className="flex items-center gap-2.5 group hover:bg-muted/30 rounded-md px-2 py-1.5 transition-colors"
        >
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[10px] font-bold text-white">
              {projectTitle
                .split(' ')
                .map((word: string) => word[0]?.toUpperCase() || '')
                .join('')
                .slice(0, 2) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {projectTitle}
            </div>
            <div className="text-[10px] text-muted-foreground">Project</div>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border/50">
        <div className={cn(
          "relative transition-all",
          isSearchFocused && "ring-1 ring-blue-500/50"
        )}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="h-7 pl-7 pr-2 text-xs bg-background/50 border-border/50 focus:bg-background"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <FileTree projectId={projectId} query={query} />
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 p-2 space-y-1">
        <Profile />
      </div>
    </div>
  )
}

