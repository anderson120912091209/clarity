/**
 * Diff Service
 * 
 * Computes and visualizes diffs between original and modified code.
 * Handles:
 * - Diff computation (insertions, deletions, edits)
 * - Monaco decorations (green/red highlighting)
 * - ViewZones for showing deleted lines
 * - ContentWidgets for Accept/Reject buttons
 */

import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { ComputedDiff, DiffType, generateId } from './types'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AcceptRejectWidget } from '../react/quick-edit/AcceptRejectWidget'

// ============================================================================
// Diff Computation
// ============================================================================

/**
 * Compute diffs between original and new code
 * Returns a list of changes with their types and locations
 */
export function computeDiffs(
  originalCode: string,
  newCode: string,
  startLine: number = 1  // Line offset in the file
): ComputedDiff[] {
  const originalLines = originalCode.split('\n')
  const newLines = newCode.split('\n')
  const diffs: ComputedDiff[] = []
  
  // Use LCS-based diff algorithm
  const lcsMatrix = buildLCSMatrix(originalLines, newLines)
  const changes = extractChanges(lcsMatrix, originalLines, newLines)
  
  let diffIdCounter = 0
  let currentOriginalLine = 1
  let currentNewLine = startLine
  
  for (const change of changes) {
    if (change.type === 'equal') {
      currentOriginalLine += change.count
      currentNewLine += change.count
    } else if (change.type === 'insert') {
      diffs.push({
        type: 'insertion',
        diffId: ++diffIdCounter,
        startLine: currentNewLine,
        endLine: currentNewLine + change.count - 1,
        originalCode: '',
        originalStartLine: currentOriginalLine,
        originalEndLine: currentOriginalLine - 1,  // Empty range
      })
      currentNewLine += change.count
    } else if (change.type === 'delete') {
      diffs.push({
        type: 'deletion',
        diffId: ++diffIdCounter,
        startLine: currentNewLine,
        endLine: currentNewLine - 1,  // Empty range (deleted)
        originalCode: change.lines.join('\n'),
        originalStartLine: currentOriginalLine,
        originalEndLine: currentOriginalLine + change.count - 1,
      })
      currentOriginalLine += change.count
    } else if (change.type === 'replace') {
      const oldCount = change.oldCount ?? 0
      const newCount = change.newCount ?? 0
      const oldLines = change.oldLines ?? []
      diffs.push({
        type: 'edit',
        diffId: ++diffIdCounter,
        startLine: currentNewLine,
        endLine: currentNewLine + newCount - 1,
        originalCode: oldLines.join('\n'),
        originalStartLine: currentOriginalLine,
        originalEndLine: currentOriginalLine + oldCount - 1,
      })
      currentOriginalLine += oldCount
      currentNewLine += newCount
    }
  }
  
  return diffs
}

// ============================================================================
// LCS Algorithm (Longest Common Subsequence)
// ============================================================================

interface LCSMatrix {
  matrix: number[][]
  rows: number
  cols: number
}

function buildLCSMatrix(original: string[], modified: string[]): LCSMatrix {
  const m = original.length
  const n = modified.length
  const matrix: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (original[i - 1] === modified[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1])
      }
    }
  }
  
  return { matrix, rows: m, cols: n }
}

interface Change {
  type: 'equal' | 'insert' | 'delete' | 'replace'
  count: number
  lines: string[]
  // For replace type
  oldLines?: string[]
  newLines?: string[]
  oldCount?: number
  newCount?: number
}

function extractChanges(
  lcs: LCSMatrix,
  original: string[],
  modified: string[]
): Change[] {
  const { matrix, rows, cols } = lcs
  const changes: Change[] = []
  
  let i = rows
  let j = cols
  const reversedChanges: { type: 'equal' | 'insert' | 'delete'; line: string; origIdx: number; modIdx: number }[] = []
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
      reversedChanges.push({ type: 'equal', line: original[i - 1], origIdx: i - 1, modIdx: j - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      reversedChanges.push({ type: 'insert', line: modified[j - 1], origIdx: i - 1, modIdx: j - 1 })
      j--
    } else {
      reversedChanges.push({ type: 'delete', line: original[i - 1], origIdx: i - 1, modIdx: j - 1 })
      i--
    }
  }
  
  // Reverse to get correct order
  reversedChanges.reverse()
  
  // Group consecutive same-type changes
  let currentChange: Change | null = null
  
  for (const item of reversedChanges) {
    if (!currentChange || currentChange.type !== item.type) {
      if (currentChange) {
        changes.push(currentChange)
      }
      currentChange = {
        type: item.type,
        count: 1,
        lines: [item.line],
      }
    } else {
      currentChange.count++
      currentChange.lines.push(item.line)
    }
  }
  
  if (currentChange) {
    changes.push(currentChange)
  }
  
  // Merge adjacent insert/delete into replace
  const mergedChanges: Change[] = []
  for (let k = 0; k < changes.length; k++) {
    const curr = changes[k]
    const next = changes[k + 1]
    
    if (curr.type === 'delete' && next?.type === 'insert') {
      mergedChanges.push({
        type: 'replace',
        count: 0,
        lines: [],
        oldLines: curr.lines,
        newLines: next.lines,
        oldCount: curr.count,
        newCount: next.count,
      })
      k++ // Skip next
    } else if (curr.type === 'insert' && next?.type === 'delete') {
      mergedChanges.push({
        type: 'replace',
        count: 0,
        lines: [],
        oldLines: next.lines,
        newLines: curr.lines,
        oldCount: next.count,
        newCount: curr.count,
      })
      k++ // Skip next
    } else {
      mergedChanges.push(curr)
    }
  }
  
  return mergedChanges
}

// ============================================================================
// Monaco Decorations
// ============================================================================

/**
 * CSS class names for diff decorations
 */
export const DIFF_DECORATION_CLASSES = {
  greenLine: 'qe-diff-green-line',
  greenGutter: 'qe-diff-green-gutter',
  redLine: 'qe-diff-red-line',
  streamingLine: 'qe-streaming-line',
  streamingBelow: 'qe-streaming-below',
  streamingCursor: 'qe-streaming-cursor',
} as const

/**
 * Add decorations for a computed diff
 * Returns decoration IDs for later cleanup
 */
export function addDiffDecorations(
  editor: editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  diff: ComputedDiff
): string[] {
  const decorations: monaco.editor.IModelDeltaDecoration[] = []
  const model = editor.getModel()
  if (!model) return []
  
  // Green highlighting for insertions and edits (the new lines)
  if (diff.type === 'insertion' || diff.type === 'edit') {
    decorations.push({
      range: new monacoInstance.Range(
        diff.startLine,
        1,
        diff.endLine,
        model.getLineMaxColumn(diff.endLine)
      ),
      options: {
        className: DIFF_DECORATION_CLASSES.greenLine,
        glyphMarginClassName: DIFF_DECORATION_CLASSES.greenGutter,
        isWholeLine: true,
        minimap: { color: { id: 'minimapGutter.addedBackground' }, position: 2 },
        overviewRuler: { color: { id: 'editorOverviewRuler.addedForeground' }, position: 7 },
      },
    })
  }
  
  return editor.deltaDecorations([], decorations)
}

/**
 * Add a ViewZone to show deleted lines (red background)
 */
export function addDeletedLinesViewZone(
  editor: editor.IStandaloneCodeEditor,
  diff: ComputedDiff,
  afterLine: number
): string | null {
  if (diff.type !== 'deletion' && diff.type !== 'edit') {
    return null
  }
  
  if (!diff.originalCode) return null
  
  let viewZoneId: string | null = null
  
  editor.changeViewZones(accessor => {
    const domNode = document.createElement('div')
    domNode.className = DIFF_DECORATION_CLASSES.redLine
    domNode.style.backgroundColor = 'rgba(255, 85, 85, 0.15)'
    domNode.style.width = '100%'
    domNode.style.overflow = 'hidden'
    domNode.style.whiteSpace = 'pre'
    domNode.style.fontFamily = 'var(--monaco-font-family, monospace)'
    domNode.style.fontSize = 'var(--monaco-font-size, 13px)'
    domNode.style.lineHeight = 'var(--monaco-line-height, 20px)'
    
    const lines = diff.originalCode.split('\n')
    lines.forEach(line => {
      const lineDiv = document.createElement('div')
      lineDiv.style.textDecoration = 'line-through'
      lineDiv.style.opacity = '0.7'
      lineDiv.style.color = 'var(--vscode-editor-foreground, inherit)'
      lineDiv.textContent = line || '\u00a0'  // Non-breaking space for empty lines
      domNode.appendChild(lineDiv)
    })
    
    const viewZone: editor.IViewZone = {
      afterLineNumber: afterLine,
      heightInLines: lines.length,
      domNode,
      suppressMouseDown: false,
    }
    
    viewZoneId = accessor.addZone(viewZone)
  })
  
  return viewZoneId
}

/**
 * Create Accept/Reject widget for a specific diff
 */
export function createAcceptRejectWidget(
  editor: editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  diff: ComputedDiff,
  onAccept: () => void,
  onReject: () => void
): { widget: editor.IContentWidget, root: any } {
  const widgetId = `qe-widget-${diff.diffId}-${Date.now()}`
  const domNode = document.createElement('div')
  domNode.className = 'qe-accept-reject-widget-container'
  
  // Right padding as requested
  domNode.style.paddingRight = '24px'
  // Ensure it doesn't block clicks beneath it
  domNode.style.pointerEvents = 'none'
  // But allow clicks on the widget itself
  domNode.style.display = 'flex'
  domNode.style.justifyContent = 'flex-end'
  
  const root = createRoot(domNode)
  
  // Wrap in a div that catches pointer events
  const WidgetWrapper = () => 
    React.createElement('div', { style: { pointerEvents: 'auto' } },
      React.createElement(AcceptRejectWidget, {
        diffId: diff.diffId,
        onAccept,
        onReject,
        startLine: diff.startLine,
      })
    )

  root.render(React.createElement(WidgetWrapper))
  
  const widget: editor.IContentWidget = {
    getId: () => widgetId,
    getDomNode: () => domNode,
    getPosition: () => {
      // Position at the END of the diff
      const model = editor.getModel()
      const endLine = diff.endLine
      const endCol = model ? model.getLineMaxColumn(endLine) : 1
      
      return {
        position: { lineNumber: endLine, column: endCol },
        // Show BELOW the line to avoid obscuring code
        preference: [monacoInstance.editor.ContentWidgetPositionPreference.BELOW],
      }
    },
  }
  
  editor.addContentWidget(widget)
  
  return { widget, root }
}


/**
 * Remove decorations by ID
 */
export function removeDecorations(
  editor: editor.IStandaloneCodeEditor,
  decorationIds: string[]
): void {
  editor.deltaDecorations(decorationIds, [])
}

/**
 * Remove a ViewZone by ID
 */
export function removeViewZone(
  editor: editor.IStandaloneCodeEditor,
  viewZoneId: string
): void {
  editor.changeViewZones(accessor => {
    accessor.removeZone(viewZoneId)
  })
}

// ============================================================================
// Streaming Decorations
// ============================================================================

/**
 * Add streaming decorations (sweep animation)
 * Shows current line being written + dimmed lines below
 */
export function addStreamingDecorations(
  editor: editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  currentLine: number,
  currentCol: number,
  endLine: number
): string[] {
  const model = editor.getModel()
  if (!model) return []
  
  const decorations: monaco.editor.IModelDeltaDecoration[] = []
  
  // Current line (bright highlight)
  decorations.push({
    range: new monacoInstance.Range(
      currentLine,
      1,
      currentLine,
      model.getLineMaxColumn(currentLine)
    ),
    options: {
      className: DIFF_DECORATION_CLASSES.streamingLine,
      isWholeLine: true,
    },
  })
  
  // Cursor position
  decorations.push({
    range: new monacoInstance.Range(
      currentLine,
      currentCol,
      currentLine,
      currentCol
    ),
    options: {
      afterContentClassName: DIFF_DECORATION_CLASSES.streamingCursor,
    },
  })
  
  // Lines below (dimmed)
  if (currentLine + 1 <= endLine) {
    decorations.push({
      range: new monacoInstance.Range(
        currentLine + 1,
        1,
        endLine,
        model.getLineMaxColumn(endLine)
      ),
      options: {
        className: DIFF_DECORATION_CLASSES.streamingBelow,
        isWholeLine: true,
      },
    })
  }
  
  return editor.deltaDecorations([], decorations)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find text in code and return its line range
 */
export function findTextInCode(
  text: string,
  fileContents: string,
  startingAtLine?: number
): { startLine: number; endLine: number } | null {
  const lines = fileContents.split('\n')
  const textLines = text.split('\n')
  
  const startIdx = startingAtLine ? startingAtLine - 1 : 0
  
  // Try exact match first
  for (let i = startIdx; i <= lines.length - textLines.length; i++) {
    let match = true
    for (let j = 0; j < textLines.length; j++) {
      if (lines[i + j] !== textLines[j]) {
        match = false
        break
      }
    }
    if (match) {
      return {
        startLine: i + 1,
        endLine: i + textLines.length,
      }
    }
  }

  // Fallback: Try match ignoring whitespace (trim)
  for (let i = startIdx; i <= lines.length - textLines.length; i++) {
    let match = true
    for (let j = 0; j < textLines.length; j++) {
      // Allow empty lines to match anything empty-ish
      if (textLines[j].trim() === '' && lines[i + j].trim() === '') continue
      
      if (lines[i + j].trim() !== textLines[j].trim()) {
        match = false
        break
      }
    }
    if (match) {
      return {
        startLine: i + 1,
        endLine: i + textLines.length,
      }
    }
  }
  
  return null
}
