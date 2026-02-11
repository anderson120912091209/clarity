'use client'

import type * as monaco from 'monaco-editor'
import {
  ensureMonacoLanguageRegistered,
  getShikiLanguageId,
  type EditorLanguageId,
} from '../syntax/languages/registry'

const SHIKI_VERSION = '3.12.2'
const SHIKI_URL = `https://esm.sh/shiki@${SHIKI_VERSION}`
const SHIKI_MONACO_URL = `https://esm.sh/@shikijs/monaco@${SHIKI_VERSION}`
const SUPPORTED_EDITOR_LANGUAGES: EditorLanguageId[] = ['latex', 'typst']

type ShikiHighlighter = unknown

interface ShikiModule {
  createHighlighter: (options: {
    themes: string[]
    langs: string[]
  }) => Promise<ShikiHighlighter>
}

interface ShikiMonacoModule {
  shikiToMonaco: (
    highlighter: ShikiHighlighter,
    monacoInstance: typeof monaco
  ) => void
}

type MonacoEditorWithShikiAlias = typeof monaco.editor & {
  __shikiThemeAliasBase?: typeof monaco.editor.setTheme
}

let setupPromise: Promise<{
  highlighter: ShikiHighlighter
  shikiToMonaco: (
    highlighter: ShikiHighlighter,
    monacoInstance: typeof monaco
  ) => void
}> | null = null

function importFromUrl(url: string): Promise<unknown> {
  // Use native `import()` at runtime without asking the bundler to resolve http(s) specifiers.
  // eslint-disable-next-line no-eval
  return (0, eval)(`import(${JSON.stringify(url)})`)
}

export async function setupShikiMonaco(monacoInstance: typeof monaco): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      const [shikiModule, shikiMonacoModule] = (await Promise.all([
        importFromUrl(SHIKI_URL),
        importFromUrl(SHIKI_MONACO_URL),
      ])) as [ShikiModule, ShikiMonacoModule]

      const { createHighlighter } = shikiModule
      const { shikiToMonaco } = shikiMonacoModule

      const highlighter = await createHighlighter({
        themes: ['vitesse-dark', 'vitesse-light'],
        langs: SUPPORTED_EDITOR_LANGUAGES.map((languageId) =>
          getShikiLanguageId(languageId)
        ),
      })

      return { highlighter, shikiToMonaco }
    })().catch((err) => {
      // If the CDN import fails (offline/CSP), let the editor fall back to Monaco's built-in highlighting.
      setupPromise = null
      throw err
    })
  }

  const { highlighter, shikiToMonaco } = await setupPromise

  ensureMonacoLanguageRegistered(monacoInstance, 'latex')
  ensureMonacoLanguageRegistered(monacoInstance, 'typst')

  // Re-apply tokenization on every call to keep switching stable.
  shikiToMonaco(highlighter, monacoInstance)

  // Map common Monaco theme names to Shiki themes so theme switches don't throw.
  // Re-wrap when the underlying setTheme implementation changes (for example after restoring default mode).
  const editorWithAlias = monacoInstance.editor as MonacoEditorWithShikiAlias
  const currentSetTheme = monacoInstance.editor.setTheme
  if (editorWithAlias.__shikiThemeAliasBase !== currentSetTheme) {
    monacoInstance.editor.setTheme = (themeName: string) => {
      const mapped =
        themeName === 'light' || themeName === 'vs'
          ? 'vitesse-light'
          : themeName === 'dark' || themeName === 'vs-dark' || themeName === 'cursor-dark'
            ? 'vitesse-dark'
            : themeName
      return currentSetTheme.call(monacoInstance.editor, mapped)
    }
    editorWithAlias.__shikiThemeAliasBase = currentSetTheme
  }
}
