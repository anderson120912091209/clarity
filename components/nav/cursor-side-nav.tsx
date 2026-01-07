'use client'

import React, { useState } from 'react'
import FileTree from '@/components/file-tree/file-tree'
import { Input } from '@/components/ui/input'
import { Search, Settings, PanelLeft, MoreHorizontal, Sparkles } from 'lucide-react'
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
    <div className="h-full flex flex-col bg-zinc-950/50 border-r border-border/40 text-sm select-none">
      {/* Header */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-border/40 shrink-0">
        <Link 
          href="/projects" 
          className="flex items-center gap-3 overflow-hidden group rounded-md px-1.5 py-1 -ml-1.5 transition-all hover:bg-white/5"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:shadow transition-all">
            <span className="text-[9px] font-bold text-white tracking-tight">
              {projectInitials}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground/90 truncate text-xs leading-none mb-0.5">
              {projectTitle}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-none">
              Workspace
            </span>
          </div>
        </Link>
        
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md">
           <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Global Actions / Search */}
      <div className="px-3 py-3 space-y-2 shrink-0">
         <div className={cn(
           "group relative transition-all duration-200 rounded-lg overflow-hidden bg-muted/40 border border-transparent has-[:focus]:bg-background has-[:focus]:border-primary/20 has-[:focus]:ring-1 has-[:focus]:ring-primary/20"
         )}>
           <Search className={cn(
             "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
             isSearchFocused ? "text-primary" : "text-muted-foreground/70"
           )} />
           <Input
             placeholder="Search..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             onFocus={() => setIsSearchFocused(true)}
             onBlur={() => setIsSearchFocused(false)}
             className="h-8 pl-8 pr-2 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
           />
         </div>
         
         {!query && (
            <div className="flex gap-1">
               <button className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ask AI</span>
               </button>
               <button className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
               </button>
            </div>
         )}
      </div>

      {/* Navigation / File Tree */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
        <div className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider pl-4 mb-1">
          Explorer
        </div>
        <FileTree projectId={projectId} query={query} />
      </div>

      {/* Footer / User Profile */}
      <div className="p-3 border-t border-border/40 bg-zinc-900/20">
        <Profile />
      </div>
    </div>
  )
}
