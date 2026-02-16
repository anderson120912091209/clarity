'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { startStripeCheckout } from '@/lib/stripe/checkout'
import posthog from 'posthog-js'

interface UpgradeModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function UpgradeModal({ open, onOpenChange, trigger }: UpgradeModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    posthog.capture('checkout_started', {
      plan: 'supporter',
      price: 9,
      currency: 'USD',
      source: 'upgrade_modal',
    })

    try {
      await startStripeCheckout({
        successPath: '/projects?checkout=success',
        cancelPath: '/projects?checkout=cancel',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      posthog.captureException(error)
      window.alert(message)
      setIsUpgrading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl bg-[#1C1D1F] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center mb-2">Upgrade Your Plan</DialogTitle>
          <p className="text-sm text-zinc-400 text-center">Choose the plan that works best for you</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Free Plan */}
          <div className="rounded-lg border border-white/10 bg-[#0d0d0f] p-6">
            <div className="mb-4">
              <p className="text-zinc-300 text-sm uppercase tracking-wide">Free</p>
              <h3 className="text-3xl font-semibold text-white mt-2">$0</h3>
              <p className="text-zinc-400 mt-2 text-sm">For drafting and previews.</p>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>Editor & LaTeX/Typst</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>Cloud preview</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>One project</span>
              </li>
            </ul>

            <Button disabled className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed">
              Current Plan
            </Button>
          </div>

          {/* Supporter Plan */}
          <div className="group relative rounded-lg bg-[#0c0c0e] p-6 overflow-hidden">
            {/* Glossy Border Effect */}
            <div className="absolute inset-0 rounded-lg p-[1px] bg-white/10 overflow-hidden">
               <div className="absolute inset-[-100%] 
               bg-[conic-gradient(from_0deg,transparent_0_180deg,#6D78E7_360deg)] 
               opacity-0 group-hover:opacity-25 transition-opacity duration-9000 
               animate-[spin_9s_linear_infinite]" />
            </div>
            {/* Background & Content Container */}
            <div className="absolute inset-[1px] rounded-[7px] bg-[#0c0c0e] z-0" />
            
            <div className="absolute inset-0 bg-gradient-to-br from-[#6D78E7]/10 via-transparent to-transparent opacity-100 pointer-events-none z-0" />
            <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/40 to-transparent z-10" />
            <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/10 to-transparent z-10" />
            
            <div className="relative z-10">
              <div className="mb-4">
                <p className="text-[#9ea7ff] text-sm uppercase tracking-wide font-medium">Supporter</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <h3 className="text-3xl font-semibold text-white">$9</h3>
                  <span className="text-base text-zinc-300 font-normal">/ mo</span>
                </div>
                <p className="text-zinc-300 mt-2 text-sm">For serious research.</p>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Team controls</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Faster builds</span>
                </li>
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-white text-black hover:bg-zinc-200 shadow-lg border-0"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Upgrade Now'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
