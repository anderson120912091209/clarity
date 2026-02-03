'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  containerClassName?: string
  showHeader?: boolean
}

/**
 * Shared layout wrapper for consistent app structure
 * Used by both dashboard and editor layouts
 */
export function AppLayout({ 
  sidebar, 
  header, 
  children, 
  containerClassName,
  showHeader = true 
}: AppLayoutProps) {
  return (
    <div className="h-screen bg-[#090909] text-white flex font-sans selection:bg-white/20">
      {/* Sidebar Slot */}
      {sidebar}
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 pt-16 lg:pt-3 overflow-hidden transition-all duration-300 ease-out">
        {/* Content Container */}
        <div 
          id="main-content-wrapper" 
          className={cn(
            "flex-1 bg-[#101011] border-[0.5px] border-white/[0.12] rounded-md flex flex-col overflow-hidden",
            containerClassName
          )}
        >
          {/* Header Slot */}
          {showHeader && header && (
            <div 
              id="content-wrapper-header" 
              className="flex items-center justify-between px-4 py-2.5 shrink-0"
            >
              {header}
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
