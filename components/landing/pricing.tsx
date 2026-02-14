'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startStripeCheckout } from '@/lib/stripe/checkout'

export function Pricing() {
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    try {
      await startStripeCheckout({
        successPath: '/projects?checkout=success',
        cancelPath: '/?checkout=cancel',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      window.alert(message)
      setIsUpgrading(false)
    }
  }

  return (
    <section id="pricing" className="py-24 px-6 bg-[#0c0c0e] border-y border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100">Simple pricing</h2>
          <p className="text-zinc-400 mt-4 text-base md:text-lg">
            Start free, then upgrade when you are ready to collaborate at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0f] p-8">
            <div className="mb-6">
              <p className="text-zinc-300 text-sm uppercase tracking-wide">Free</p>
              <h3 className="text-4xl font-semibold text-white mt-2">$0</h3>
              <p className="text-zinc-400 mt-2">For getting started with drafting and previews.</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200" />
                Editor with LaTeX and Typst support
              </li>
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200" />
                Real-time cloud preview
              </li>
              <li className="flex items-start gap-2 text-zinc-300 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-zinc-200" />
                One active project
              </li>
            </ul>

            <Button asChild className="w-full bg-zinc-100 text-black hover:bg-zinc-200">
              <Link href="/login">Start free</Link>
            </Button>
          </div>

          <div className="group relative rounded-2xl bg-[#0c0c0e] p-8 overflow-hidden 
          transition-all">
            {/* Glossy Border Effect */}
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-white/10 overflow-hidden">
               <div className="absolute inset-[-100%] 
               bg-[conic-gradient(from_0deg,transparent_0_180deg,#6D78E7_360deg)] 
               opacity-0 group-hover:opacity-25 transition-opacity duration-9000 
               animate-[spin_9s_linear_infinite]" />
            </div>
            {/* Background & Content Container */}
            <div className="absolute inset-[1px] rounded-[15px] bg-[#0c0c0e] z-0" />
            
            <div className="absolute inset-0 bg-gradient-to-br from-[#6D78E7]/10 via-transparent to-transparent opacity-100 pointer-events-none z-0" />
            <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/40 to-transparent z-10" />
            <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/10 to-transparent z-10" />
            
            <div className="relative z-10">
              <div className="mb-6">
                <p className="text-[#9ea7ff] text-sm uppercase tracking-wide font-medium">Pro</p>
                <h3 className="text-4xl font-semibold text-white mt-2">$9 <span className="text-lg text-zinc-400 font-normal">/ month</span></h3>
                <p className="text-zinc-300 mt-2">Research, organize, write and publish. </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-zinc-200 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7]" />
                  Unlimited projects
                </li>
                <li className="flex items-start gap-2 text-zinc-200 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7]" />
                  More AI usage and superior models
                </li>
                <li className="flex items-start gap-2 text-zinc-200 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7]" />
                  Priority compute for faster builds
                </li>
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-white text-black shadow-lg border-0"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
