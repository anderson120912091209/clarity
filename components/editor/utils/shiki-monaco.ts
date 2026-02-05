'use client'

import type * as monaco from 'monaco-editor'

const SHIKI_VERSION = '3.12.2'
const SHIKI_URL = `https://esm.sh/shiki@${SHIKI_VERSION}`
const SHIKI_MONACO_URL = `https://esm.sh/@shikijs/monaco@${SHIKI_VERSION}`

let setupPromise: Promise<{
  highlighter: any
  shikiToMonaco: (highlighter: any, monacoInstance: typeof monaco) => void
}> | null = null

function importFromUrl(url: string): Promise<any> {
  // Use native `import()` at runtime without asking the bundler to resolve http(s) specifiers.
  // eslint-disable-next-line no-eval
  return (0, eval)(`import(${JSON.stringify(url)})`)
}

export async function setupShikiMonaco(monacoInstance: typeof monaco): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      const [{ createHighlighter }, { shikiToMonaco }] = await Promise.all([
        importFromUrl(SHIKI_URL),
        importFromUrl(SHIKI_MONACO_URL),
      ])

      const highlighter = await createHighlighter({
        themes: ['vitesse-dark', 'vitesse-light'],
        langs: ['latex'],
      })

      return { highlighter, shikiToMonaco }
    })().catch((err) => {
      // If the CDN import fails (offline/CSP), let the editor fall back to Monaco's built-in highlighting.
      setupPromise = null
      throw err
    })
  }

  const { highlighter, shikiToMonaco } = await setupPromise

  try {
    const alreadyRegistered = monacoInstance.languages
      .getLanguages?.()
      ?.some((l: any) => l.id === 'latex')
    if (!alreadyRegistered) {
      monacoInstance.languages.register({ id: 'latex' })
    }
  } catch {
    monacoInstance.languages.register({ id: 'latex' })
  }

  // Re-apply tokenization on every call to keep switching stable.
  shikiToMonaco(highlighter, monacoInstance)

  // Map common Monaco theme names to Shiki themes so patched setTheme doesn't throw.
  const editorAny = monacoInstance.editor as any
  if (!editorAny.__shikiThemeAliasApplied) {
    const baseSetTheme = monacoInstance.editor.setTheme.bind(monacoInstance.editor)
    monacoInstance.editor.setTheme = (themeName: string) => {
      const mapped =
        themeName === 'light' || themeName === 'vs'
          ? 'vitesse-light'
          : themeName === 'dark' || themeName === 'vs-dark'
            ? 'vitesse-dark'
            : themeName
      return baseSetTheme(mapped)
    }
    editorAny.__shikiThemeAliasApplied = true
  }
}
