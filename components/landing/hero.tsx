'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Terminal, Share2, FileCode2 } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  const ctaSizeClass = 'h-[54px] w-full max-w-[250px]'

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
            className={`${ctaSizeClass} px-8 bg-white text-black hover:bg-zinc-200
             text-sm font-semibold shadow-md rounded-md transition-colors cursor-crosshair`}
          >
            <Link href="/login" className="flex h-full w-full items-center justify-center cursor-crosshair">
              Get Started Now
            </Link>
          </Button>
          <a
            href="https://www.producthunt.com/products/clarity-21/launches/clarity-5e700cce-895a-4d47-82ba-fa0b32065d14?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-clarity-5e700cce-895a-4d47-82ba-fa0b32065d14"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Clarity on Product Hunt"
            className={`${ctaSizeClass} cursor-crosshair hidden sm:block`}
          >
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1046258&theme=light&t=1771405187279"
              alt="{clarity} - notebook for science & math, type your math notes fast! | Product Hunt"
              className="block h-full w-full"
              width="250"
              height="54"
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
          href="https://www.producthunt.com/products/clarity-21/launches/clarity-5e700cce-895a-4d47-82ba-fa0b32065d14?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-clarity-5e700cce-895a-4d47-82ba-fa0b32065d14"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Clarity on Product Hunt"
          className={`${ctaSizeClass} cursor-crosshair mx-auto mt-8 block sm:hidden`}
        >
          <img
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1046258&theme=light&t=1771405187279"
            alt="{clarity} - notebook for science & math, type your math notes fast! | Product Hunt"
            className="block h-full w-full"
            width="250"
            height="54"
            loading="lazy"
          />
        </a>

      </div>
    </section>
  )
}

function Search(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
