'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startStripeCheckout } from '@/lib/stripe/checkout'
import posthog from 'posthog-js'
import { useLocale } from '@/contexts/LocaleContext'

export function Pricing() {
  const { t } = useLocale()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    posthog.capture('checkout_started', {
      plan: 'pro',
      price: 9,
      currency: 'USD',
      source: 'pricing_page',
    })

    try {
      await startStripeCheckout({
        successPath: '/projects?checkout=success',
        cancelPath: '/?checkout=cancel',
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
    <section id="pricing" className="py-24 px-6 bg-[#0c0c0e] border-y border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100">{t('pricing.title')}</h2>
          <p className="text-zinc-400 mt-4 text-base md:text-lg">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6">
          <div className="rounded-xl md:rounded-2xl border border-white/10 bg-[#0d0d0f] p-4 md:p-8">
            <div className="mb-4 md:mb-6">
              <p className="text-zinc-300 text-[10px] md:text-sm uppercase tracking-wide">{t('pricing.free_label')}</p>
              <h3 className="text-2xl md:text-4xl font-semibold text-white mt-1 md:mt-2">{t('pricing.free_price')}</h3>
              <p className="text-zinc-400 mt-1 md:mt-2 text-[10px] md:text-base leading-tight">{t('pricing.free_desc')}</p>
            </div>

            <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>{t('pricing.free_feature_1')}</span>
              </li>
              <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>{t('pricing.free_feature_2')}</span>
              </li>
              <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-zinc-200 shrink-0" />
                <span>{t('pricing.free_feature_3')}</span>
              </li>
            </ul>

            <Button asChild className="w-full h-8 md:h-10 text-[11px] md:text-sm bg-zinc-100 text-black hover:bg-zinc-200">
              <Link href="/login">{t('pricing.free_cta')}</Link>
            </Button>
          </div>

          <div className="group relative rounded-xl md:rounded-2xl bg-[#0c0c0e] p-4 md:p-8 overflow-hidden
          transition-all">
            {/* Glossy Border Effect */}
            <div className="absolute inset-0 rounded-xl md:rounded-2xl p-[1px] bg-white/10 overflow-hidden">
               <div className="absolute inset-[-100%]
               bg-[conic-gradient(from_0deg,transparent_0_180deg,#6D78E7_360deg)]
               opacity-0 group-hover:opacity-25 transition-opacity duration-9000
               animate-[spin_9s_linear_infinite]" />
            </div>
            {/* Background & Content Container */}
            <div className="absolute inset-[1px] rounded-[11px] md:rounded-[15px] bg-[#0c0c0e] z-0" />

            <div className="absolute inset-0 bg-gradient-to-br from-[#6D78E7]/10 via-transparent to-transparent opacity-100 pointer-events-none z-0" />
            <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/40 to-transparent z-10" />
            <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6D78E7]/10 to-transparent z-10" />

            <div className="relative z-10">
              <div className="mb-4 md:mb-6">
                <p className="text-[#9ea7ff] text-[10px] md:text-sm uppercase tracking-wide font-medium">{t('pricing.pro_label')}</p>
                <div className="flex items-baseline gap-1 mt-1 md:mt-2">
                  <h3 className="text-2xl md:text-4xl font-semibold text-white">{t('pricing.pro_price')}</h3>
                  <span className="text-[10px] md:text-lg text-zinc-300 font-normal">{t('pricing.pro_period')}</span>
                </div>
                <p className="text-zinc-300 mt-1 md:mt-2 text-[10px] md:text-base leading-tight">{t('pricing.pro_desc')}</p>
              </div>

              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                  <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>{t('pricing.pro_feature_1')}</span>
                </li>
                <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                  <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>{t('pricing.pro_feature_2')}</span>
                </li>
                <li className="flex items-start gap-1.5 md:gap-2 text-zinc-300 text-[10px] md:text-sm">
                  <Check className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>{t('pricing.pro_feature_3')}</span>
                </li>
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full h-8 md:h-10 text-[11px] md:text-sm bg-white text-black shadow-lg border-0"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                    <span className="hidden sm:inline">{t('pricing.pro_loading')}</span>
                    <span className="sm:hidden">{t('pricing.pro_loading_short')}</span>
                  </>
                ) : (
                  t('pricing.pro_cta')
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
