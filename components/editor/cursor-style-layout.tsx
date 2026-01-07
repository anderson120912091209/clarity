'use client'

import React, { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { X, FileText, ChevronRight } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'

interface Tab {
  id: string
  name: string
  type: 'file' | 'preview'
}

export function CursorStyleLayout({ 
  fileTree, 
  editor, 
  preview,
  chatSidebar 
}: { 
  fileTree: React.ReactNode
  editor: React.ReactNode
  preview: React.ReactNode
  chatSidebar: React.ReactNode
}) {
  const { currentlyOpen } = useProject()
  const [openTabs, setOpenTabs] = useState<Tab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  React.useEffect(() => {
    if (currentlyOpen) {
      const tabId = currentlyOpen.id
      const existingTab = openTabs.find(t => t.id === tabId)
      
      if (!existingTab) {
        setOpenTabs(prev => [...prev, {
          id: tabId,
          name: currentlyOpen.name,
          type: 'file'
        }])
      }
      setActiveTab(tabId)
    }
  }, [currentlyOpen])

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenTabs(prev => prev.filter(t => t.id !== tabId))
    if (activeTab === tabId) {
      const remaining = openTabs.filter(t => t.id !== tabId)
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar - Editor Tabs */}
      <div className="h-9 bg-[hsl(var(--muted)/0.3)] border-b border-border/50 flex items-center px-2 gap-1 overflow-x-auto scrollbar-thin">
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 h-7 rounded-t-md text-xs font-medium transition-all cursor-pointer",
              "hover:bg-muted/50 border border-b-0 border-transparent",
              activeTab === tab.id
                ? "bg-background border-border text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{tab.name}</span>
            <button
              onClick={(e) => closeTab(tab.id, e)}
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted",
                "ml-1"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* File Tree Sidebar */}
        <ResizablePanel 
          defaultSize={16} 
          minSize={12} 
          maxSize={30}
          collapsible={true}
          className="bg-[hsl(var(--muted)/0.2)] border-r border-border/50"
        >
          {fileTree}
        </ResizablePanel>
        
        <ResizableHandle withHandle className="w-1 hover:w-2 transition-all" />
        
        {/* Editor Area */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            {editor}
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="w-1 hover:w-2 transition-all" />
        
        {/* Preview/PDF Area */}
        <ResizablePanel defaultSize={34} minSize={20} collapsible={true}>
          <div className="h-full flex flex-col bg-[hsl(var(--muted)/0.1)]">
            {preview}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Status Bar */}
      <div className="h-6 bg-[hsl(var(--muted)/0.3)] border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>LaTeX</span>
          {currentlyOpen && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {currentlyOpen.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>

      {/* Chat Sidebar - Overlay */}
      {chatSidebar}
    </div>
  )
}

