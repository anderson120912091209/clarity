export type PdfBackgroundThemeKey =
  | 'midnight-indigo'
  | 'graphite-fog'
  | 'abyss-blue'
  | 'forest-night'
  | 'ember-night'
  | 'plum-shadow'
  | 'slate-cyan'
  | 'teal-noir'
  | 'ruby-dusk'
  | 'obsidian'

export interface PdfBackgroundThemeOption {
  key: PdfBackgroundThemeKey
  label: string
  panelColor: string
  dotColor: string
  dotSize: number
  dotSpacing: number
}

export const DEFAULT_PDF_BACKGROUND_THEME: PdfBackgroundThemeKey = 'obsidian'
export const PDF_BACKGROUND_THEME_CHANGE_EVENT = 'pdf-background-theme-change'

export const PDF_BACKGROUND_THEME_OPTIONS: readonly PdfBackgroundThemeOption[] = [
  {
    key: 'midnight-indigo',
    label: 'Midnight Indigo',
    panelColor: '#191925',
    dotColor: '#ffffff10',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'graphite-fog',
    label: 'Graphite Fog',
    panelColor: '#1c1f24',
    dotColor: '#e8edf812',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'abyss-blue',
    label: 'Abyss Blue',
    panelColor: '#12212d',
    dotColor: '#98ccff14',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'forest-night',
    label: 'Forest Night',
    panelColor: '#14231e',
    dotColor: '#93deb714',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'ember-night',
    label: 'Ember Night',
    panelColor: '#251a17',
    dotColor: '#ffbf9d14',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'plum-shadow',
    label: 'Plum Shadow',
    panelColor: '#23172b',
    dotColor: '#d8aef214',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'slate-cyan',
    label: 'Slate Cyan',
    panelColor: '#18232a',
    dotColor: '#9cd6e714',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'teal-noir',
    label: 'Teal Noir',
    panelColor: '#152628',
    dotColor: '#9fe0d914',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'ruby-dusk',
    label: 'Ruby Dusk',
    panelColor: '#251620',
    dotColor: '#f5a3bf14',
    dotSize: 1,
    dotSpacing: 20,
  },
  {
    key: 'obsidian',
    label: 'Obsidian',
    panelColor: 'zinc-900/30',
    dotColor: '#ffffff10',
    dotSize: 1,
    dotSpacing: 20,
  },
]

export function isPdfBackgroundThemeKey(value: string | null | undefined): value is PdfBackgroundThemeKey {
  if (!value) return false
  return PDF_BACKGROUND_THEME_OPTIONS.some((theme) => theme.key === value)
}

export function getPdfBackgroundThemeStorageKey(projectId: string): string {
  return `pdfBackgroundTheme:${projectId}`
}

export function resolvePdfBackgroundTheme(value: string | undefined | null): PdfBackgroundThemeOption {
  const option = PDF_BACKGROUND_THEME_OPTIONS.find((theme) => theme.key === value)
  return option ?? PDF_BACKGROUND_THEME_OPTIONS[0]
}
