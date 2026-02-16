'use client'

import { useState, useEffect } from 'react'
import { Laptop, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function MobileProductNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Check if we are on mobile
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        // Check if user has already dismissed it this session
        const hasDismissed = sessionStorage.getItem('mobile-notice-dismissed')
        if (!hasDismissed) {
          setOpen(true)
        }
      }
    }

    checkMobile()
    
    // Optional: Listen for resize events to show it if user shrinks window
    // window.addEventListener('resize', checkMobile)
    // return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleDismiss = () => {
    setOpen(false)
    sessionStorage.setItem('mobile-notice-dismissed', 'true')
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="w-[90%] rounded-xl bg-[#1C1D1F] border border-white/10 text-white">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6D78E7]/10">
            <Laptop className="h-6 w-6 text-[#6D78E7]" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Desktop Recommended</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-zinc-400">
            Clarity is optimized for desktop use. For the best editing and collaboration experience, we recommend switching to a computer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleDismiss}
            className="w-full bg-[#6D78E7] hover:bg-[#5b65c4] text-white border-0"
          >
            Continue anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
