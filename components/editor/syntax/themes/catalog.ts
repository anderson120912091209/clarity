export type EditorSyntaxTheme = 'default' | 'shiki'

export const DEFAULT_EDITOR_SYNTAX_THEME: EditorSyntaxTheme = 'shiki'

export interface EditorSyntaxThemeOption {
  value: EditorSyntaxTheme
  label: string
}

export const EDITOR_SYNTAX_THEME_OPTIONS: readonly EditorSyntaxThemeOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'shiki', label: 'Shiki' },
] as const

export function resolveMonacoThemeForSyntaxTheme(
  syntaxTheme: EditorSyntaxTheme,
  isDark: boolean
): string {
  if (syntaxTheme === 'shiki') {
    return isDark ? 'vitesse-dark' : 'vitesse-light'
  }

  return isDark ? 'vs-dark' : 'vs'
}
