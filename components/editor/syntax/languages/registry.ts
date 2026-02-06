import type * as monaco from 'monaco-editor'
import type { IDisposable, languages } from 'monaco-editor'
import latexMonarchLanguage from 'monaco-latex'
import { typstMonarchLanguage } from './monarch/typst'

export type EditorLanguageId = 'latex' | 'typst'

const LATEX_EXTENSIONS = new Set(['tex', 'sty', 'cls', 'bib'])
const TYPST_EXTENSIONS = new Set(['typ', 'typst'])

const MONARCH_BY_LANGUAGE: Record<EditorLanguageId, languages.IMonarchLanguage> = {
  latex: latexMonarchLanguage,
  typst: typstMonarchLanguage,
}

export function resolveEditorLanguageId(fileName?: string | null): EditorLanguageId {
  if (!fileName) {
    return 'latex'
  }

  const normalizedName = fileName.trim().toLowerCase()
  const extension = normalizedName.includes('.')
    ? normalizedName.split('.').pop() ?? ''
    : ''

  if (TYPST_EXTENSIONS.has(extension)) {
    return 'typst'
  }

  if (LATEX_EXTENSIONS.has(extension)) {
    return 'latex'
  }

  return 'latex'
}

export function ensureMonacoLanguageRegistered(
  monacoInstance: typeof monaco,
  languageId: EditorLanguageId
): void {
  try {
    const alreadyRegistered = monacoInstance.languages
      .getLanguages?.()
      ?.some((language) => language.id === languageId)

    if (!alreadyRegistered) {
      monacoInstance.languages.register({ id: languageId })
    }
  } catch {
    monacoInstance.languages.register({ id: languageId })
  }
}

export function applyMonarchTokensProvider(
  monacoInstance: typeof monaco,
  languageId: EditorLanguageId
): IDisposable {
  ensureMonacoLanguageRegistered(monacoInstance, languageId)
  return monacoInstance.languages.setMonarchTokensProvider(
    languageId,
    MONARCH_BY_LANGUAGE[languageId]
  )
}

export function getShikiLanguageId(languageId: EditorLanguageId): string {
  return languageId
}
