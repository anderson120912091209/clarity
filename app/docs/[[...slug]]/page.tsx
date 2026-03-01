import { notFound } from 'next/navigation'
import { docsContent, getAllDocSlugs } from '@/lib/docs/content'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDocsLocaleData } from '@/lib/docs/get-localized-content'
import { DocsContent } from '@/components/docs/docs-content'
import type { Metadata } from 'next'
import { addLocalePrefix, buildLocaleAlternates } from '@/lib/i18n/pathname'

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
  const slugPath = slug === 'introduction' ? '/docs' : `/docs/${slug}`

  const locale = await getLocale()
  const localeData = await getDocsLocaleData(locale)

  const page = localeData?.pages?.[slug] ?? docsContent[slug]

  if (!page) return { title: 'Not Found \u2014 Clarity Docs' }

  return {
    title: `${page.title} \u2014 Clarity Docs`,
    description: page.description,
    alternates: {
      canonical: addLocalePrefix(slugPath, locale),
      languages: buildLocaleAlternates(slugPath),
    },
  }
}

export function generateStaticParams() {
  const slugs = getAllDocSlugs()
  return [
    { slug: [] }, // /docs -> introduction
    ...slugs.map((s) => ({ slug: s.split('/') })),
  ]
}

export default async function DocsPage({ params }: Props) {
  const { slug: slugArr } = await params
  const slug = resolveSlug(slugArr)

  const locale = await getLocale()
  const localeData = await getDocsLocaleData(locale)

  const page = localeData?.pages?.[slug] ?? docsContent[slug]

  if (!page) notFound()

  return <DocsContent slug={slug} page={page} />
}
