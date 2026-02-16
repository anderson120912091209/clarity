'use client'

import { useState } from 'react'
import { X, Laptop } from 'lucide-react'

export function MobileNotice() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="relative z-50 flex items-center justify-between gap-3 bg-[#6D78E7]/10 px-4 py-3 text-sm text-[#6D78E7] md:hidden border-b border-[#6D78E7]/20">
      <div className="flex items-center gap-3">
        <Laptop className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          For the best experience, please use Clarity on a computer.
        </span>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="shrink-0 p-1 hover:bg-[#6D78E7]/10 rounded-full transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
