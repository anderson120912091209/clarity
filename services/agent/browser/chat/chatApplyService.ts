import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import type { ComputedDiff } from '@/services/agent/browser/quick-edit/types'
import {
  computeDiffs,
  addDiffDecorations,
  addDeletedLinesViewZone,
  createAcceptRejectWidget,
} from '@/services/agent/browser/quick-edit/diffService'

export type FileSuggestionApplyMode = 'replace_file' | 'search_replace'

export interface FileSuggestionApplyResult {
  mode: FileSuggestionApplyMode
  nextContent: string
  changed: boolean
  diffs: ComputedDiff[]
  firstChangedLine: number
  appliedOperations: number
  warnings: string[]
  summary: {
    insertions: number
    deletions: number
    edits: number
    linesAdded: number
    linesDeleted: number
    totalChangedBlocks: number
  }
}

interface SearchReplaceBlock {
  search: string
  replace: string
}

interface ActiveEditorBinding {
  editor: editor.IStandaloneCodeEditor
  monacoInstance: typeof monaco
  onChange?: (value: string) => void
}

interface InlineDiffPreviewEntry {
  diff: ComputedDiff
  decorationIds: string[]
  viewZoneId: string | null
  widget: editor.IContentWidget | null
  root: any | null
  resolved: boolean
}

class ChatApplyService {
  private activeEditorBinding: ActiveEditorBinding | null = null
  private inlinePreviewEntries: InlineDiffPreviewEntry[] = []
  private pendingProgrammaticPersistBypassCount = 0

  bindActiveEditor(binding: ActiveEditorBinding): void {
    this.activeEditorBinding = binding
  }

  unbindActiveEditor(editorInstance: editor.IStandaloneCodeEditor): void {
    if (!this.activeEditorBinding || this.activeEditorBinding.editor !== editorInstance) return
    this.clearInlinePreview()
    this.activeEditorBinding = null
  }

  consumeProgrammaticPersistBypass(): boolean {
    if (this.pendingProgrammaticPersistBypassCount <= 0) return false
    this.pendingProgrammaticPersistBypassCount -= 1
    return true
  }

  private markProgrammaticPersistBypass(): void {
    this.pendingProgrammaticPersistBypassCount += 1
  }

  applySuggestionToFile(
    currentContent: string,
    suggestedContent: string,
    mode?: FileSuggestionApplyMode
  ): FileSuggestionApplyResult {
    const normalizedCurrent = this.normalizeLineEndings(currentContent ?? '')
    const normalizedSuggested = this.normalizeLineEndings(suggestedContent ?? '')

    const resolvedMode =
      mode ??
      (this.containsSearchReplaceBlocks(normalizedSuggested) ? 'search_replace' : 'replace_file')

    let nextContent = normalizedCurrent
    let appliedOperations = 0
    const warnings: string[] = []

    if (resolvedMode === 'search_replace') {
      const replaceResult = this.applySearchReplaceBlocks(normalizedCurrent, normalizedSuggested)
      nextContent = replaceResult.nextContent
      appliedOperations = replaceResult.appliedBlocks
      warnings.push(...replaceResult.warnings)
    } else {
      nextContent = normalizedSuggested
      appliedOperations = normalizedCurrent === nextContent ? 0 : 1
    }

    const diffs = computeDiffs(normalizedCurrent, nextContent, 1)
    const changed = normalizedCurrent !== nextContent
    const firstChangedLine =
      diffs.length > 0
        ? Math.max(
            1,
            Math.min(
              ...diffs.map((diff) =>
                diff.type === 'deletion'
                  ? Math.max(1, diff.originalStartLine)
                  : Math.max(1, diff.startLine)
              )
            )
          )
        : 1

    const summary = diffs.reduce(
      (acc, diff) => {
        if (diff.type === 'insertion') {
          acc.insertions += 1
          acc.linesAdded += Math.max(0, diff.endLine - diff.startLine + 1)
        } else if (diff.type === 'deletion') {
          acc.deletions += 1
          acc.linesDeleted += Math.max(0, diff.originalEndLine - diff.originalStartLine + 1)
        } else {
          acc.edits += 1
          acc.linesAdded += Math.max(0, diff.endLine - diff.startLine + 1)
          acc.linesDeleted += Math.max(0, diff.originalEndLine - diff.originalStartLine + 1)
        }
        return acc
      },
      { insertions: 0, deletions: 0, edits: 0, linesAdded: 0, linesDeleted: 0 }
    )

    return {
      mode: resolvedMode,
      nextContent,
      changed,
      diffs,
      firstChangedLine,
      appliedOperations,
      warnings,
      summary: {
        ...summary,
        totalChangedBlocks: diffs.length,
      },
    }
  }

  previewSuggestionInActiveEditor(
    suggestedContent: string,
    mode?: FileSuggestionApplyMode,
    options?: { suppressPersistence?: boolean }
  ): (FileSuggestionApplyResult & { appliedInEditor: boolean }) | null {
    const binding = this.activeEditorBinding
    if (!binding) return null

    const { editor: activeEditor, monacoInstance, onChange } = binding
    const model = activeEditor.getModel()
    if (!model) return null
    if (activeEditor.getOption(monacoInstance.editor.EditorOption.readOnly)) {
      return null
    }

    const currentContent = model.getValue()
    const result = this.applySuggestionToFile(currentContent, suggestedContent, mode)
    if (!result.changed) {
      this.clearInlinePreview()
      return { ...result, appliedInEditor: false }
    }

    this.clearInlinePreview()

    const fullRange = model.getFullModelRange()
    if (options?.suppressPersistence) {
      this.markProgrammaticPersistBypass()
    }
    activeEditor.executeEdits('ai-chat-apply-preview', [
      {
        range: fullRange,
        text: result.nextContent,
        forceMoveMarkers: true,
      },
    ])

    this.inlinePreviewEntries = result.diffs.map((diff) => {
      const decorationIds = addDiffDecorations(activeEditor, monacoInstance, diff)
      const viewZoneId =
        diff.type === 'deletion' || diff.type === 'edit'
          ? addDeletedLinesViewZone(activeEditor, diff, Math.max(0, diff.startLine - 1))
          : null

      const entry: InlineDiffPreviewEntry = {
        diff,
        decorationIds,
        viewZoneId: viewZoneId ?? null,
        widget: null,
        root: null,
        resolved: false,
      }

      const clearEntryUI = () => {
        if (entry.decorationIds.length > 0) {
          activeEditor.deltaDecorations(entry.decorationIds, [])
          entry.decorationIds = []
        }

        if (entry.viewZoneId) {
          const zoneId = entry.viewZoneId
          activeEditor.changeViewZones((accessor) => accessor.removeZone(zoneId))
          entry.viewZoneId = null
        }

        if (entry.widget && entry.root) {
          entry.root.unmount()
          activeEditor.removeContentWidget(entry.widget)
          entry.widget = null
          entry.root = null
        }
      }

      const markResolved = (): boolean => {
        if (entry.resolved) return false
        entry.resolved = true
        return true
      }

      const acceptDiff = () => {
        if (!markResolved()) return
        clearEntryUI()
        onChange?.(activeEditor.getValue())
      }

      const rejectDiff = () => {
        if (!markResolved()) return
        this.revertInlineDiff(activeEditor, monacoInstance, entry.diff)
        clearEntryUI()
        onChange?.(activeEditor.getValue())
      }

      const widgetResult = createAcceptRejectWidget(
        activeEditor,
        monacoInstance,
        diff,
        acceptDiff,
        rejectDiff
      )

      entry.widget = widgetResult.widget
      entry.root = widgetResult.root
      return entry
    })

    onChange?.(activeEditor.getValue())
    return { ...result, appliedInEditor: true }
  }

  clearActiveInlinePreview(): void {
    this.clearInlinePreview()
  }

  replaceActiveEditorContent(
    content: string,
    options?: { suppressPersistence?: boolean }
  ): boolean {
    const binding = this.activeEditorBinding
    if (!binding) return false

    const { editor: activeEditor, monacoInstance, onChange } = binding
    const model = activeEditor.getModel()
    if (!model) return false
    if (activeEditor.getOption(monacoInstance.editor.EditorOption.readOnly)) return false

    this.clearInlinePreview()
    const normalizedContent = this.normalizeLineEndings(content ?? '')
    if (model.getValue() === normalizedContent) {
      return true
    }

    if (options?.suppressPersistence) {
      this.markProgrammaticPersistBypass()
    }

    activeEditor.executeEdits('ai-chat-apply-replace', [
      {
        range: model.getFullModelRange(),
        text: normalizedContent,
        forceMoveMarkers: true,
      },
    ])

    onChange?.(activeEditor.getValue())
    return true
  }

  private clearInlinePreview(): void {
    if (!this.activeEditorBinding) {
      this.inlinePreviewEntries = []
      return
    }

    const activeEditor = this.activeEditorBinding.editor
    for (const entry of this.inlinePreviewEntries) {
      if (entry.decorationIds.length > 0) {
        activeEditor.deltaDecorations(entry.decorationIds, [])
        entry.decorationIds = []
      }

      if (entry.viewZoneId) {
        const zoneId = entry.viewZoneId
        activeEditor.changeViewZones((accessor) => accessor.removeZone(zoneId))
        entry.viewZoneId = null
      }

      if (entry.widget && entry.root) {
        entry.root.unmount()
        activeEditor.removeContentWidget(entry.widget)
        entry.widget = null
        entry.root = null
      }
    }

    this.inlinePreviewEntries = []
  }

  private revertInlineDiff(
    activeEditor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    diff: ComputedDiff
  ): void {
    const model = activeEditor.getModel()
    if (!model) return

    if (diff.type === 'deletion') {
      const insertLine = Math.max(1, Math.min(diff.startLine, model.getLineCount() + 1))
      const original = diff.originalCode.trimEnd()
      if (!original) return
      activeEditor.executeEdits('ai-chat-apply-reject', [
        {
          range: new monacoInstance.Range(insertLine, 1, insertLine, 1),
          text: `${original}\n`,
          forceMoveMarkers: true,
        },
      ])
      return
    }

    if (model.getLineCount() === 0) return
    const safeStartLine = Math.max(1, Math.min(diff.startLine, model.getLineCount()))
    const safeEndLine = Math.max(safeStartLine, Math.min(diff.endLine, model.getLineCount()))
    const safeEndColumn = model.getLineMaxColumn(safeEndLine)

    const replacement = diff.type === 'edit' ? diff.originalCode : ''
    activeEditor.executeEdits('ai-chat-apply-reject', [
      {
        range: new monacoInstance.Range(safeStartLine, 1, safeEndLine, safeEndColumn),
        text: replacement,
        forceMoveMarkers: true,
      },
    ])
  }

  private normalizeLineEndings(value: string): string {
    return value.replace(/\r\n/g, '\n')
  }

  private containsSearchReplaceBlocks(value: string): boolean {
    return /<<<<<<<[\s\S]*?=======[\s\S]*?>>>>>>>/m.test(value)
  }

  private parseSearchReplaceBlocks(value: string): SearchReplaceBlock[] {
    const blocks: SearchReplaceBlock[] = []
    const lines = this.normalizeLineEndings(value).split('\n')
    let cursor = 0

    while (cursor < lines.length) {
      const line = lines[cursor].trimStart()
      if (!line.startsWith('<<<<<<<')) {
        cursor += 1
        continue
      }

      cursor += 1
      const searchLines: string[] = []
      while (cursor < lines.length && !lines[cursor].trimStart().startsWith('=======')) {
        searchLines.push(lines[cursor])
        cursor += 1
      }

      if (cursor >= lines.length) break
      cursor += 1

      const replaceLines: string[] = []
      while (cursor < lines.length && !lines[cursor].trimStart().startsWith('>>>>>>>')) {
        replaceLines.push(lines[cursor])
        cursor += 1
      }

      if (cursor >= lines.length) break
      cursor += 1

      blocks.push({
        search: searchLines.join('\n'),
        replace: replaceLines.join('\n'),
      })
    }

    return blocks
  }

  private applySearchReplaceBlocks(
    currentContent: string,
    payload: string
  ): { nextContent: string; appliedBlocks: number; warnings: string[] } {
    const blocks = this.parseSearchReplaceBlocks(payload)
    if (!blocks.length) {
      return {
        nextContent: currentContent,
        appliedBlocks: 0,
        warnings: ['No SEARCH/REPLACE blocks were found in suggestion.'],
      }
    }

    let next = currentContent
    let applied = 0
    const warnings: string[] = []

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]
      const exactIndex = block.search ? next.indexOf(block.search) : -1

      if (exactIndex !== -1) {
        next = `${next.slice(0, exactIndex)}${block.replace}${next.slice(exactIndex + block.search.length)}`
        applied += 1
        continue
      }

      const trimmedSearch = block.search.trim()
      if (trimmedSearch) {
        const fuzzyIndex = next.indexOf(trimmedSearch)
        if (fuzzyIndex !== -1) {
          next = `${next.slice(0, fuzzyIndex)}${block.replace}${next.slice(fuzzyIndex + trimmedSearch.length)}`
          applied += 1
          warnings.push(
            `SEARCH/REPLACE block #${index + 1} applied with trimmed fallback match.`
          )
          continue
        }
      }

      warnings.push(`SEARCH/REPLACE block #${index + 1} could not find a matching SEARCH region.`)
    }

    return {
      nextContent: next,
      appliedBlocks: applied,
      warnings,
    }
  }
}

export const chatApplyService = new ChatApplyService()
