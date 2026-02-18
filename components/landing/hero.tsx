'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Hero() {
  const ctaButtonSizeClass = 'h-[54px] w-full max-w-[250px]'
  const badgeSizeClass = 'w-full max-w-[250px]'
  const productHuntLaunchUrl =
    'https://www.producthunt.com/products/clarity-21?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-clarity-89170959-d8de-41bc-a06f-3686aed72d5b'
  const productHuntBadgeSrc =
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1080188&theme=light&t=1771420904394'

  return (
    <section className="relative pt-24 pb-16 md:pt-40 md:pb-24 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col items-start text-left">
        
        {/* Headline */}
        <h1 className="text-3xl md:text-[38px] leading-[1.2] font-semibold tracking-tight text-zinc-300 mb-5 max-w-3xl">
          Collaborative AI-Powered Scientific Editor.<br />
        </h1>

        {/* Subtext */}
        <p className="max-w-xl text-sm md:text-lg text-zinc-400 mb-8 leading-relaxed font-normal">
          Clarity helps researchers, professors and students to compose and collaborate on their research papers faster. 
          (Supports LaTeX & Typst) 
        </p>

        {/* CTA */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-4 mb-16 md:mb-20">
          <Button
            asChild
            className={`${ctaButtonSizeClass} px-8 bg-white text-black hover:bg-zinc-200
             text-sm font-semibold shadow-md rounded-md transition-colors cursor-crosshair`}
          >
            <Link href="/login" className="flex h-full w-full items-center justify-center cursor-crosshair">
              Get Started Now
            </Link>
          </Button>
          <a
            href={productHuntLaunchUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Clarity on Product Hunt"
            className={`${badgeSizeClass} cursor-crosshair hidden sm:block`}
          >
            <img
              src={productHuntBadgeSrc}
              alt="{clarity} - AI powered overleaf alternative | Product Hunt"
              className="block h-auto w-full"
              width={250}
              height={54}
              loading="lazy"
            />
          </a>
        </div>

        {/* Media Layout - Heptabase Replication */}
        <div className="relative w-full">
            {/* Background Container (The "image in the back") */}
            <div className="relative overflow-hidden rounded-md pt-8 md:pt-20 px-4 md:px-12">
                 {/* Background Image */}
                 <div className="absolute inset-0 pointer-events-none">
                    <img 
                        src="/landing/heroscene-art.jpg" 
                        alt="Hero background" 
                        className="w-full h-full object-cover opacity-50 md:opacity-100"
                    />
                 </div>
                 
                 {/* Foreground Video/Image Container */}
                 <div className="relative z-10 shadow-2xl rounded-t-xl 
                 overflow-hidden border border-black/70 mx-auto max-w-[1100px] bg-white translate-y-1">
                     <img 
                        src="/landing/screenshot2.png"
                        alt="Jules Editor Interface"
                        className="w-full h-auto block"
                     />
                 </div>
            </div>
        </div>

        {/* Product Hunt - Mobile Only */}
        <a
          href={productHuntLaunchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Clarity on Product Hunt"
          className={`${badgeSizeClass} cursor-crosshair mx-auto mt-8 block sm:hidden`}
        >
          <img
            src={productHuntBadgeSrc}
            alt="{clarity} - AI powered overleaf alternative | Product Hunt"
            className="block h-auto w-full"
            width={250}
            height={54}
            loading="lazy"
          />
        </a>

      </div>
    </section>
  )
}
