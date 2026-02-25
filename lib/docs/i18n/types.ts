export interface DocsUIStrings {
  search: string
  onThisPage: string
  previous: string
  next: string
  wasThisHelpful: string
  thanksFeedback: string
  willImprove: string
  results: string
  noResults: string
  features: string
  more: string
  docs: string
  blog: string
  home: string
}

export interface DocsLocaleData {
  /** Translated nav item titles, keyed by slug */
  navTitles: Record<string, string>
  /** Translated doc pages, keyed by slug */
  pages: Record<
    string,
    {
      title: string
      description: string
      content: string
    }
  >
  /** UI strings used in docs components */
  ui: DocsUIStrings
}
