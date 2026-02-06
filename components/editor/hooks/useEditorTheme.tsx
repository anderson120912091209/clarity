'use client'
import * as monaco from 'monaco-editor'
import { useTheme } from 'next-themes'
import { CURSOR_DARK_MONACO_THEME } from '../syntax/themes/monaco/cursorDarkTheme'

export const useEditorTheme = () => {
  const { theme, systemTheme } = useTheme()

  const setTheme = (monacoInstance: typeof monaco) => {
    const safeSetTheme = (themeId: string) => {
      try {
        monacoInstance.editor.setTheme(themeId)
        return true
      } catch (error) {
        console.warn(`[EditorTheme] Failed to set theme "${themeId}"`, error)
        return false
      }
    }

    monacoInstance.editor.defineTheme('cursor-dark', CURSOR_DARK_MONACO_THEME)

    const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
    const preferredTheme = isDark ? 'cursor-dark' : 'vs'
    if (safeSetTheme(preferredTheme)) return

    // If Shiki patched Monaco's setTheme, fall back to known Shiki themes.
    const shikiFallback = isDark ? 'vitesse-dark' : 'vitesse-light'
    if (safeSetTheme(shikiFallback)) return

    // Final fallback to built-in Monaco themes.
    safeSetTheme(isDark ? 'vs-dark' : 'vs')
  }

  return { setTheme }
}
