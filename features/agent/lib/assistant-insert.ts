export type InsertMode =
  | 'append'
  | 'line'
  | 'after_line'
  | 'before_line'
  | 'after_text'
  | 'before_text'
  | 'replace_file'
  | 'search_replace'

export interface AssistantInsertBlock {
  filePath?: string
  insertMode: InsertMode
  line?: number
  anchorText?: string
  code: string
}

export function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`')))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function looksLikeFilePath(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 260) return false
  if (/^(?:@|#|%|\/\/|\\)/.test(trimmed)) return false
  if (/^(?:[A-Za-z]:[\\/]|\/|\.\/|\.\.\/)/.test(trimmed)) return true
  if (/[\\/]/.test(trimmed)) return true
  if (/\.[A-Za-z0-9]{1,8}$/.test(trimmed) && !/\s/.test(trimmed)) return true
  return false
}

export function parseInsertInstruction(
  value: string
): Pick<AssistantInsertBlock, 'insertMode' | 'line' | 'anchorText'> {
  const normalized = value.trim()
  if (!normalized) return { insertMode: 'append' }

  const lineMatch = /^(after_line|before_line|line)\s*(?:=|:)?\s*(\d+)$/i.exec(normalized)
  if (lineMatch) {
    return {
      insertMode: lineMatch[1].toLowerCase() as InsertMode,
      line: Number.parseInt(lineMatch[2], 10),
    }
  }

  if (/^(replace_file|full_file|replace)$/i.test(normalized)) {
    return { insertMode: 'replace_file' }
  }

  if (/^(search_replace|search\/replace|search-replace)$/i.test(normalized)) {
    return { insertMode: 'search_replace' }
  }

  const anchorMatch = /^(after|before)\s*(?:=|:)?\s*(.+)$/i.exec(normalized)
  if (anchorMatch) {
    return {
      insertMode: `${anchorMatch[1].toLowerCase()}_text` as InsertMode,
      anchorText: stripWrappingQuotes(anchorMatch[2]),
    }
  }

  if (/^append$/i.test(normalized)) {
    return { insertMode: 'append' }
  }

  return { insertMode: 'append' }
}

export function parseMetadataLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const match = /^(?:(?:\/\/|#|%|--)\s*)?@?([a-z_]+)\s*:\s*(.+)$/i.exec(trimmed)
  if (!match) return null

  const key = match[1].toLowerCase()
  const knownKeys = new Set([
    'file',
    'path',
    'target',
    'insert',
    'edit',
    'mode',
    'line',
    'after_line',
    'before_line',
    'after',
    'before',
  ])
  if (!knownKeys.has(key)) return null

  return { key, value: match[2].trim() }
}

export function parseAssistantInsertBlocks(message: string): AssistantInsertBlock[] {
  const blocks: AssistantInsertBlock[] = []
  const codeFenceRegex = /```([^\n`]*)\n([\s\S]*?)```/g

  let match: RegExpExecArray | null
  while ((match = codeFenceRegex.exec(message)) !== null) {
    const blockBody = match[2].replace(/\r\n/g, '\n')
    const lines = blockBody.split('\n')
    const parsed: AssistantInsertBlock = {
      insertMode: 'append',
      code: '',
    }

    let cursor = 0
    while (cursor < lines.length && lines[cursor].trim() === '') {
      cursor += 1
    }

    if (cursor < lines.length && looksLikeFilePath(lines[cursor])) {
      parsed.filePath = stripWrappingQuotes(lines[cursor])
      cursor += 1
    }

    while (cursor < lines.length) {
      const metadata = parseMetadataLine(lines[cursor])
      if (!metadata) break

      const value = stripWrappingQuotes(metadata.value)
      if (metadata.key === 'file' || metadata.key === 'path' || metadata.key === 'target') {
        parsed.filePath = value
      } else if (metadata.key === 'insert' || metadata.key === 'edit' || metadata.key === 'mode') {
        const insert = parseInsertInstruction(value)
        parsed.insertMode = insert.insertMode
        parsed.line = insert.line
        parsed.anchorText = insert.anchorText
      } else if (metadata.key === 'line') {
        parsed.insertMode = 'line'
        parsed.line = Number.parseInt(value, 10)
      } else if (metadata.key === 'after_line') {
        parsed.insertMode = 'after_line'
        parsed.line = Number.parseInt(value, 10)
      } else if (metadata.key === 'before_line') {
        parsed.insertMode = 'before_line'
        parsed.line = Number.parseInt(value, 10)
      } else if (metadata.key === 'after') {
        parsed.insertMode = 'after_text'
        parsed.anchorText = value
      } else if (metadata.key === 'before') {
        parsed.insertMode = 'before_text'
        parsed.anchorText = value
      }

      cursor += 1
    }

    const codeLines = lines.slice(cursor)
    while (codeLines.length > 0 && codeLines[0].trim() === '') {
      codeLines.shift()
    }

    const code = codeLines.join('\n').trimEnd()
    if (!code) continue

    parsed.code = code
    blocks.push(parsed)
  }

  return blocks
}

export function describeInsertTarget(block: AssistantInsertBlock): string {
  switch (block.insertMode) {
    case 'line':
      return block.line ? `Replace line ${block.line}` : 'Replace line'
    case 'after_line':
      return block.line ? `Insert after line ${block.line}` : 'Insert after line'
    case 'before_line':
      return block.line ? `Insert before line ${block.line}` : 'Insert before line'
    case 'after_text':
      return block.anchorText ? `Insert after anchor: ${block.anchorText}` : 'Insert after anchor'
    case 'before_text':
      return block.anchorText ? `Insert before anchor: ${block.anchorText}` : 'Insert before anchor'
    case 'append':
      return 'Append to file'
    case 'replace_file':
      return 'Replace full file from suggestion'
    case 'search_replace':
      return 'Apply SEARCH/REPLACE edit blocks'
    default:
      return 'Append to file'
  }
}

export function applyAssistantInsertBlock(
  currentContent: string,
  block: AssistantInsertBlock
): { nextContent: string; focusLine: number } {
  const source = currentContent ?? ''
  const snippet = block.code.trimEnd()
  if (!snippet) {
    return { nextContent: source, focusLine: 1 }
  }

  const insertAtLineIndex = (lineIndex: number): { nextContent: string; focusLine: number } => {
    const sourceLines = source.length > 0 ? source.split('\n') : []
    const safeIndex = Math.max(0, Math.min(lineIndex, sourceLines.length))
    const snippetLines = snippet.split('\n')
    const nextLines = [
      ...sourceLines.slice(0, safeIndex),
      ...snippetLines,
      ...sourceLines.slice(safeIndex),
    ]
    return {
      nextContent: nextLines.join('\n'),
      focusLine: safeIndex + 1,
    }
  }

  const findAnchorLine = (anchor: string): number | null => {
    if (!anchor) return null
    const index = source.indexOf(anchor)
    if (index === -1) return null
    return source.slice(0, index).split('\n').length
  }

  if (block.insertMode === 'line' && block.line) {
    return insertAtLineIndex(Math.max(0, block.line - 1))
  }
  if (block.insertMode === 'after_line' && block.line) {
    return insertAtLineIndex(Math.max(0, block.line))
  }
  if (block.insertMode === 'before_line' && block.line) {
    return insertAtLineIndex(Math.max(0, block.line - 1))
  }
  if (block.insertMode === 'before_text' && block.anchorText) {
    const line = findAnchorLine(block.anchorText)
    if (line !== null) return insertAtLineIndex(Math.max(0, line - 1))
  }
  if (block.insertMode === 'after_text' && block.anchorText) {
    const line = findAnchorLine(block.anchorText)
    if (line !== null) return insertAtLineIndex(Math.max(0, line))
  }

  if (!source.length) {
    return { nextContent: snippet, focusLine: 1 }
  }

  const lineCount = source.split('\n').length
  const separator = source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n'
  const focusLine = lineCount + (separator === '' ? 0 : separator === '\n' ? 1 : 2)
  return {
    nextContent: `${source}${separator}${snippet}`,
    focusLine,
  }
}
