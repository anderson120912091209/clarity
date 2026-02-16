"use client"

import { Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AiQuotaDisplayProps {
  used: number
  limit: number
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
  showLabel?: boolean
  compact?: boolean
}

export function AiQuotaDisplay({
  used,
  limit,
  loading = false,
  error,
  onRefresh,
  className,
  showLabel = true,
  compact = false,
}: AiQuotaDisplayProps) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const remaining = Math.max(0, limit - used)
  const isLow = remaining <= 5
  const isExceeded = used >= limit

  return (
    <div className={cn("w-full space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="font-medium">AI Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
               "font-medium",
               isExceeded ? "text-rose-400" : "text-zinc-400"
            )}>
               {loading ? (
                 <Loader2 className="h-3 w-3 animate-spin" />
               ) : (
                 `${used} / ${limit}`
               )}
            </span>
            {onRefresh && (
               <button
                  type="button"
                  onClick={(e) => {
                     e.stopPropagation();
                     onRefresh();
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Refresh quota"
               >
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     width="12"
                     height="12"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className={cn(loading && "animate-spin")}
                  >
                     <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                     <path d="M21 3v5h-5" />
                     <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                     <path d="M8 16H3v5" />
                  </svg>
               </button>
            )}
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
               {/* Background Glow */}
               <div 
                  className={cn(
                     "absolute inset-0 opacity-20 transition-opacity", 
                     isExceeded ? "bg-rose-900" : "bg-[#6D78E7]"
                  )} 
               />
               
               {/* Progress Bar */}
               <div
                  className={cn(
                     "h-full rounded-full transition-all duration-500 ease-out",
                     isExceeded 
                        ? "bg-gradient-to-r from-rose-500 to-rose-600" 
                        : "bg-gradient-to-r from-[#6D78E7] via-[#858FE9] to-[#6D78E7]"
                  )}
                  style={{ width: `${percent}%` }}
               />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-[#1C1D1F] border-white/10 text-zinc-300">
            {loading ? "Syncing..." : isExceeded ? "Quota exceeded" : `${remaining} requests remaining`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!compact && error && (
        <p className="text-[10px] text-rose-400 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}
