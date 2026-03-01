import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Navbar } from '@/components/landing/navbar'
import { getAllBlogPosts, getBlogPostBySlug } from '@/lib/blog/posts'
import { getLocale } from '@/lib/i18n/get-locale'
import { addLocalePrefix, buildLocaleAlternates } from '@/lib/i18n/pathname'

type BlogPostPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  const locale = await getLocale()

  if (!post) {
    return {
      title: 'Blog Not Found | Clarity',
      description: 'The requested blog post could not be found.',
    }
  }

  const slugPath = `/blogs/${post.slug}`
  const canonicalPath = addLocalePrefix(slugPath, locale)
  const title = `${post.title} | Clarity Blog`

  return {
    title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: canonicalPath,
      languages: buildLocaleAlternates(slugPath),
    },
    openGraph: {
      title,
      description: post.description,
      type: 'article',
      url: canonicalPath,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  const locale = await getLocale()

  if (!post) {
    notFound()
  }

  const slugPath = `/blogs/${post.slug}`
  const localizedSlugPath = addLocalePrefix(slugPath, locale)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    keywords: post.keywords.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': localizedSlugPath,
    },
  }

  return (
    <div className="landing-page relative min-h-screen bg-[#0c0c0e] text-zinc-200 antialiased selection:bg-zinc-800 selection:text-white">
      <Navbar />

      {/* Subtle background ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 top-0 z-[-1] h-screen w-screen bg-[#0c0c0e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]"
        aria-hidden="true"
      />

      <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-32 md:pt-40">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />

        <div className="mx-auto max-w-3xl mb-12 sm:mb-16">
          <Link
            href={addLocalePrefix('/blogs', locale)}
            className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Back to writing
          </Link>
        </div>

        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2.5 text-[13px] font-medium text-zinc-500">
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            <span aria-hidden className="h-1 w-1 rounded-full bg-zinc-700"></span>
            <span>{post.readingTime}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-zinc-700"></span>
            <span>{post.author}</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl lg:text-5xl text-balance">
            {post.title}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg text-balance">
            {post.description}
          </p>
        </header>

        <div className="mx-auto my-14 h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <article
          className="
            mx-auto max-w-3xl
            text-zinc-300
            [&_a]:font-medium [&_a]:text-zinc-100 [&_a]:underline [&_a]:decoration-zinc-700 [&_a]:underline-offset-[5px] hover:[&_a]:decoration-zinc-400 [&_a]:transition-colors
            [&_code]:rounded-md [&_code]:border [&_code]:border-white/[0.08] [&_code]:bg-white/[0.02] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:font-medium
            [&_h2]:mt-16 [&_h2]:mb-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-100
            [&_h3]:mt-12 [&_h3]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-zinc-100
            [&_li]:mt-3 [&_li]:leading-relaxed
            [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6
            [&_p]:mt-6 [&_p]:leading-relaxed [&_p]:text-[1.05rem]
            [&_pre]:mt-8 [&_pre]:mb-8 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.08] [&_pre]:bg-[#0c0c0e] [&_pre]:p-5 [&_pre]:text-[13px] [&_pre]:leading-relaxed
            [&_pre_code]:border-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-normal
            [&_table]:mt-8 [&_table]:mb-8 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm
            [&_td]:border-b [&_td]:border-white/5 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-zinc-400
            [&_th]:border-b [&_th]:border-white/10 [&_th]:bg-transparent [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_th]:text-zinc-200
            [&_tr:hover_td]:bg-white/[0.02] [&_tr]:transition-colors
            [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6
            [&_blockquote]:mt-8 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-zinc-400
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
