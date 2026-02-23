'use client'
import * as monaco from 'monaco-editor'
import { CURSOR_DARK_MONACO_THEME } from '../syntax/themes/monaco/cursorDarkTheme'

export const useEditorTheme = () => {
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

    // Editor is always dark — no light mode.
    if (safeSetTheme('cursor-dark')) return

    // If Shiki patched Monaco's setTheme, fall back to known Shiki themes.
    if (safeSetTheme('vitesse-dark')) return

    // Final fallback to built-in Monaco themes.
    safeSetTheme('vs-dark')
  }

  return { setTheme }
}
