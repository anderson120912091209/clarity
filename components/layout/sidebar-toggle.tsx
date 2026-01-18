'use client'

import React from 'react'
import Image from 'next/image'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarToggleProps {
  className?: string
}

export default function SidebarToggle({ className = '' }: SidebarToggleProps) {
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <TooltipProvider delayDuration={2000}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            onFocus={(e) => e.preventDefault()}
            className={`
              group w-7 h-7 rounded-md flex items-center justify-center
              text-zinc-400 hover:text-white hover:bg-white/5
              transition-all duration-200 ease-out
              outline-none
              ${className}
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            <Image
              src="/dashboard/SidebarLeft.svg"
              alt=""
              width={16}
              height={16}
              className={`w-4 h-4 transition-transform duration-200 brightness-0 invert opacity-70 group-hover:opacity-100 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="bg-[#6D78E7] text-white border-0 flex items-center gap-1 px-2 py-1"
        >
          <span className="text-xs font-medium">Sidebar</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex items-center justify-center min-w-[32px]">
            ⌘+B
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
