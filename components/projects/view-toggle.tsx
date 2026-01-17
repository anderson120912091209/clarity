'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.08]">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewChange('grid')}
        className={cn(
          "h-7 w-7 rounded-md transition-all",
          view === 'grid' 
            ? "bg-white/10 text-white shadow-sm" 
            : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewChange('list')}
        className={cn(
          "h-7 w-7 rounded-md transition-all",
          view === 'list' 
            ? "bg-white/10 text-white shadow-sm" 
            : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
        )}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
