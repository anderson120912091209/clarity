'use client'
import * as monaco from 'monaco-editor'
import { useTheme } from 'next-themes'

export const useEditorTheme = () => {
  const { theme, systemTheme } = useTheme()

  const setTheme = (monacoInstance: typeof monaco) => {
    // Define a refined "Cursor-like" dark theme
    monacoInstance.editor.defineTheme('cursor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'C586C0' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'variable.parameter', foreground: '9CDCFE' },
        { token: 'tag', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '9CDCFE' },
        { token: 'delimiter', foreground: 'D4D4D4' },
      ],
      colors: {
        'editor.background': '#09090b', // Zinc 950
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#18181b', // Zinc 900
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#3b82f6', // Blue cursor
        'editorWhitespace.foreground': '#3f3f46',
        'editorIndentGuide.background': '#27272a', // Zinc 800
        'editorIndentGuide.activeBackground': '#52525b', // Zinc 600
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#e4e4e7', // Zinc 200
        'editor.border': '#00000000',
        'editorWidget.background': '#18181b',
        'editorWidget.border': '#27272a',
        'list.activeSelectionBackground': '#27272a',
        'list.hoverBackground': '#27272a',
      },
    })

    const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
    monacoInstance.editor.setTheme(isDark ? 'cursor-dark' : 'vs')
  }

  return { setTheme }
}
