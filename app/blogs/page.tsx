import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'

export const metadata: Metadata = {
  title: 'Clarity Blog | Coming Soon',
  description:
    'Guides for researchers on scientific writing, LaTeX, Typst, and better academic collaboration.',
  alternates: {
    canonical: '/blogs',
  },
}

export default function BlogsPage() {
  return (
    <div className="landing-page relative min-h-screen bg-[#0c0c0e] text-zinc-200 antialiased selection:bg-zinc-800 selection:text-white">
      <Navbar />

      <div
        className="pointer-events-none fixed inset-0 top-0 z-[-1] h-screen w-screen bg-[#0c0c0e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
        aria-hidden="true"
      />

      <main className="mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center px-6">
        <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.25em] text-zinc-500">
          Blog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          In Progress
        </h1>
        <p className="mt-4 text-base text-zinc-400">
          We&#39;re working on something. Check back soon.
        </p>
      </main>
    </div>
  )
}
