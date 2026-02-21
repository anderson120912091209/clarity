import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/landing/navbar'
import { getAllBlogPosts } from '@/lib/blog/posts'

export const metadata: Metadata = {
  title: 'Clarity Blog | Scientific Writing, LaTeX, Typst, and Research Workflows',
  description:
    'Guides for researchers on scientific writing, LaTeX, Typst, and better academic collaboration.',
  alternates: {
    canonical: '/blogs',
  },
}

export default function BlogsPage() {
  const posts = getAllBlogPosts()

  return (
    <div className="landing-page relative min-h-screen bg-[#0c0c0e] text-zinc-200 antialiased selection:bg-zinc-800 selection:text-white">
      <Navbar />

      {/* Subtle background ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 top-0 z-[-1] h-screen w-screen bg-[#0c0c0e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
        aria-hidden="true"
      />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-32 md:pt-40">
        <section className="mb-16 flex flex-col items-center text-center sm:mb-24">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.25em] text-zinc-500">
            Writing
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl text-balance">
            Thoughts & workflows for modern research
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg text-balance">
            Practical guides for researchers using LaTeX, Typst, and AI workflows to ship better
            papers with less friction.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${post.slug}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.01] p-6 sm:p-8 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.03]"
            >
              <div>
                <div className="mb-4 flex items-center gap-2.5 text-xs font-medium text-zinc-500">
                  <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-zinc-700"></span>
                  <span>{post.readingTime}</span>
                </div>

                <h2 className="mb-3 text-xl sm:text-2xl font-medium tracking-tight text-zinc-100 transition-colors group-hover:text-white">
                  {post.title}
                </h2>

                <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">
                  {post.description}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/[0.08] bg-transparent px-2.5 py-1 text-[11px] font-medium tracking-wide text-zinc-400 transition-colors group-hover:border-white/[0.15] group-hover:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
