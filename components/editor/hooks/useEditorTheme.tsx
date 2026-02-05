'use client'
import * as monaco from 'monaco-editor'
import { useTheme } from 'next-themes'

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

    // Define a refined "Cursor-like" dark theme
    monacoInstance.editor.defineTheme('cursor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'd4d4d8' }, // Default text (zinc-300)
        { token: 'comment', foreground: '71717a', fontStyle: 'italic' }, // Zinc-500
        { token: 'keyword', foreground: 'c4b5fd', fontStyle: 'bold' }, // Violet-300 - Soft Purple
        { token: 'keyword.control', foreground: 'c4b5fd' },
        
        // Distinct coloring for delimiters
        { token: 'delimiter.curly', foreground: 'fde047' }, // Yellow-300 - Curly Braces {}
        { token: 'delimiter.square', foreground: 'e879f9' }, // Fuchsia-400 - Square Brackets []
        { token: 'delimiter.parenthesis', foreground: 'e879f9' }, // Fuchsia-400 - Parentheses ()
        { token: 'delimiter', foreground: 'fde047' }, // Fallback for other delimiters
        
        { token: 'operator', foreground: '93c5fd' }, // Blue-300 - Operators
        { token: 'string', foreground: '86efac' }, // Green-300 - Pastel Green
        { token: 'number', foreground: 'fdba74' }, // Orange-300 - Pastel Orange
        { token: 'regexp', foreground: 'f9a8d4' }, // Pink-300
        { token: 'type', foreground: '5eead4' }, // Teal-300
        { token: 'class', foreground: '5eead4' },
        { token: 'function', foreground: '7dd3fc' }, // Sky-300 - Pastel Blue
        { token: 'variable', foreground: 'd4d4d8' }, // Variables
        { token: 'variable.parameter', foreground: 'd4d4d8' },
        { token: 'tag', foreground: 'fca5a5' }, // Red-300
        { token: 'attribute.name', foreground: '7dd3fc' },
      ],
      colors: {
        'editor.background': '#101011', // Zinc 950
        'editor.foreground': '#d4d4d8', // Zinc 300
        'editor.lineHighlightBackground': '#18181b', // Zinc 900
        'editor.selectionBackground': '#3b82f626', // Blue with lower opacity (~15%)
        'editor.inactiveSelectionBackground': '#27272a',
        'editorCursor.foreground': '#ffffffff', // Sky 300 cursor
        'editorWhitespace.foreground': '#27272a',
        'editorIndentGuide.background': '#27272a', // Zinc 800
        'editorIndentGuide.activeBackground': '#52525b', // Zinc 600
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa', // Zinc 400
        'editor.border': '#00000000',
        'editorWidget.background': '#18181b',
        'editorWidget.border': '#27272a',
        'list.activeSelectionBackground': '#27272a',
        'list.hoverBackground': '#27272a',
      },
    })

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
