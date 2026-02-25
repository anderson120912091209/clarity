import { getLocale } from '@/lib/i18n/get-locale'
import { getDocsLocaleData } from '@/lib/docs/get-localized-content'
import { DocsLocaleProvider } from '@/lib/docs/docs-locale-provider'
import { DocsLayoutShell } from '@/components/docs/docs-layout-shell'

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const localeData = await getDocsLocaleData(locale)

  return (
    <DocsLocaleProvider
      locale={locale}
      navTitles={localeData?.navTitles}
      pages={localeData?.pages}
      uiStrings={localeData?.ui}
    >
      <DocsLayoutShell>{children}</DocsLayoutShell>
    </DocsLocaleProvider>
  )
}
