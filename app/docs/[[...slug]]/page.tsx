import { notFound } from 'next/navigation'
import { docsContent, getAllDocSlugs } from '@/lib/docs/content'
import { DocsContent } from '@/components/docs/docs-content'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug?: string[] }>
}

function resolveSlug(slugArr?: string[]): string {
  if (!slugArr || slugArr.length === 0) return 'introduction'
  return slugArr.join('/')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: slugArr } = await params
  const slug = resolveSlug(slugArr)
  const page = docsContent[slug]

  if (!page) return { title: 'Not Found — Clarity Docs' }

  return {
    title: `${page.title} — Clarity Docs`,
    description: page.description,
  }
}

export function generateStaticParams() {
  const slugs = getAllDocSlugs()
  return [
    { slug: [] }, // /docs → introduction
    ...slugs.map((s) => ({ slug: s.split('/') })),
  ]
}

export default async function DocsPage({ params }: Props) {
  const { slug: slugArr } = await params
  const slug = resolveSlug(slugArr)
  const page = docsContent[slug]

  if (!page) notFound()

  return <DocsContent slug={slug} page={page} />
}
