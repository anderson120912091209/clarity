'use client'

import { createContext, useContext, useMemo } from 'react'
import { docsNav, docsContent, type DocNavItem, type DocPage } from './content'
import type { DocsUIStrings } from './i18n/types'
import { defaultUI } from './get-localized-content'

interface DocsLocaleContextValue {
  locale: string
  nav: DocNavItem[]
  content: Record<string, DocPage>
  ui: DocsUIStrings
}

const DocsLocaleContext = createContext<DocsLocaleContextValue>({
  locale: 'en',
  nav: docsNav,
  content: docsContent,
  ui: defaultUI,
})

function applyNavTitles(
  nav: DocNavItem[],
  titles: Record<string, string>
): DocNavItem[] {
  return nav.map((item) => ({
    ...item,
    title: titles[item.slug] ?? item.title,
    children: item.children
      ? item.children.map((child) => ({
          ...child,
          title: titles[child.slug] ?? child.title,
        }))
      : undefined,
  }))
}

interface Props {
  children: React.ReactNode
  locale?: string
  navTitles?: Record<string, string>
  pages?: Record<string, { title: string; description: string; content: string }>
  uiStrings?: DocsUIStrings
}

export function DocsLocaleProvider({
  children,
  locale = 'en',
  navTitles,
  pages,
  uiStrings,
}: Props) {
  const value = useMemo(() => {
    const nav = navTitles ? applyNavTitles(docsNav, navTitles) : docsNav
    const content: Record<string, DocPage> = pages
      ? { ...docsContent, ...pages }
      : docsContent
    const ui = uiStrings ?? defaultUI
    return { locale, nav, content, ui }
  }, [locale, navTitles, pages, uiStrings])

  return (
    <DocsLocaleContext.Provider value={value}>
      {children}
    </DocsLocaleContext.Provider>
  )
}

export function useDocsLocale() {
  return useContext(DocsLocaleContext)
}
