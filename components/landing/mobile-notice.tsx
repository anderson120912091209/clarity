'use client'

import { useState } from 'react'
import { X, Laptop } from 'lucide-react'

export function MobileNotice() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed top-20 left-4 right-4 z-[60] md:hidden">
      <div className="flex items-center justify-between gap-2 bg-[#6D78E7]/10 backdrop-blur-sm px-3 py-2 text-xs text-[#6D78E7] border border-[#6D78E7]/20 rounded-full shadow-lg max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <Laptop className="h-3 w-3 shrink-0" />
          <span className="font-medium">
            Best on desktop
          </span>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="shrink-0 p-0.5 hover:bg-[#6D78E7]/10 rounded-full transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
