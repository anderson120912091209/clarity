/**
 * FIM (Fill-in-Middle) Prompts
 * 
 * Prompt generation for accurate code edits using the FIM pattern.
 * Based on Void editor's approach for high-quality inline edits.
 */

import { FIMTags, DEFAULT_FIM_TAGS } from './types'

// ============================================================================
// Constants
// ============================================================================

const MAX_PREFIX_SUFFIX_CHARS = 6000
const MAX_SECONDARY_CONTEXT_CHARS = 4800
const MAX_SECONDARY_HEAD_CHARS = 1800
const MAX_SECONDARY_TAIL_CHARS = 1400
const MAX_OUTLINE_ITEMS = 24
const MAX_OUTLINE_LINE_CHARS = 160
const TRIPLE_TICK = ['```', '```'] as const

// ============================================================================
// User Message
// ============================================================================

/**
 * Generate user message for quick edit with context
 */
export function ctrlKStream_userMessage(opts: {
  selection: string
  prefix: string
  suffix: string
  secondaryContext: string
  instructions: string
  fimTags?: FIMTags
  language: string
}): string {
  const { selection, prefix, suffix, secondaryContext, instructions, language } = opts
  const fimTags = opts.fimTags ?? DEFAULT_FIM_TAGS
  const { preTag, sufTag, midTag } = fimTags
  
  return `\

QUICK EDIT TASK
- Primary focus is the selection plus immediate surrounding context.
- Secondary context gives high-level file intent and structure. Use it to avoid inconsistent edits.
- Never modify text outside the selection.

PRIMARY SELECTION (EDIT THIS ONLY)
${TRIPLE_TICK[0]}${language}
<${midTag}>${selection}</${midTag}>
${TRIPLE_TICK[1]}

INSTRUCTIONS
${instructions}

PRIMARY SURROUNDING CONTEXT (READ-ONLY)
<${preTag}>${prefix}</${preTag}>
<${sufTag}>${suffix}</${sufTag}>

SECONDARY FILE CONTEXT (READ-ONLY)
${secondaryContext}

Output contract (strict):
- Return only: <${midTag}>...new code...</${midTag}>
- No markdown fences.
- No explanation text.`
}

// ============================================================================
// Context Extraction
// ============================================================================

/**
 * Extract prefix and suffix context around a selection
 * Respects MAX_PREFIX_SUFFIX_CHARS to avoid token limits
 */
export function extractPrefixAndSuffix(opts: {
  fullFileStr: string
  startLine: number  // 1-indexed
  endLine: number    // 1-indexed
  language?: string
}): { prefix: string; suffix: string; secondaryContext: string } {
  const { fullFileStr, startLine, endLine, language = 'plaintext' } = opts
  const fullFileLines = fullFileStr.split('\n')
  
  // Extract prefix (lines before selection)
  let prefix = ''
  let i = startLine - 1  // 0-indexed exclusive
  while (i > 0) {
    const newLine = fullFileLines[i - 1]
    if (newLine.length + 1 + prefix.length <= MAX_PREFIX_SUFFIX_CHARS) {
      prefix = `${newLine}\n${prefix}`
      i -= 1
    } else {
      break
    }
  }
  
  // Extract suffix (lines after selection)
  let suffix = ''
  let j = endLine - 1  // 0-indexed
  while (j < fullFileLines.length - 1) {
    const newLine = fullFileLines[j + 1]
    if (newLine.length + 1 + suffix.length <= MAX_PREFIX_SUFFIX_CHARS) {
      suffix = `${suffix}\n${newLine}`
      j += 1
    } else {
      break
    }
  }
  
  const secondaryContext = buildSecondaryContext({
    fullFileLines,
    startLine,
    endLine,
    language,
  })

  return { prefix, suffix, secondaryContext }
}

function buildSecondaryContext(opts: {
  fullFileLines: string[]
  startLine: number
  endLine: number
  language: string
}): string {
  const { fullFileLines, startLine, endLine, language } = opts
  const totalLines = fullFileLines.length
  const selectionLineCount = Math.max(1, endLine - startLine + 1)
  const selectionPercent = Math.round((Math.max(1, startLine) / Math.max(1, totalLines)) * 100)

  const outline = extractFileOutline(fullFileLines).slice(0, MAX_OUTLINE_ITEMS)
  const headSnapshot = takeHeadSnapshot(fullFileLines, MAX_SECONDARY_HEAD_CHARS)
  const tailSnapshot = takeTailSnapshot(fullFileLines, MAX_SECONDARY_TAIL_CHARS)

  const parts = [
    [
      `Language: ${language}`,
      `Total lines: ${totalLines}`,
      `Selection lines: ${startLine}-${endLine} (${selectionLineCount} lines)`,
      `Selection starts around: ${selectionPercent}% of file`,
    ].join('\n'),
  ]

  if (outline.length > 0) {
    parts.push(`File outline (line: snippet):\n${outline.join('\n')}`)
  }

  if (headSnapshot.trim()) {
    parts.push(
      [
        `File start snapshot (${language}):`,
        TRIPLE_TICK[0] + language,
        headSnapshot,
        TRIPLE_TICK[1],
      ].join('\n')
    )
  }

  if (tailSnapshot.trim()) {
    parts.push(
      [
        `File end snapshot (${language}):`,
        TRIPLE_TICK[0] + language,
        tailSnapshot,
        TRIPLE_TICK[1],
      ].join('\n')
    )
  }

  const combined = parts.join('\n\n')
  if (combined.length <= MAX_SECONDARY_CONTEXT_CHARS) return combined
  return `${combined.slice(0, MAX_SECONDARY_CONTEXT_CHARS)}\n\n[Secondary context truncated]`
}

function takeHeadSnapshot(lines: string[], maxChars: number): string {
  let out = ''
  for (const line of lines) {
    if ((out.length + line.length + 1) > maxChars) break
    out += (out ? '\n' : '') + line
  }
  return out
}

function takeTailSnapshot(lines: string[], maxChars: number): string {
  let out = ''
  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    const line = lines[idx]
    const candidate = out ? `${line}\n${out}` : line
    if (candidate.length > maxChars) break
    out = candidate
  }
  return out
}

function extractFileOutline(lines: string[]): string[] {
  const outlinePatterns = [
    /^\\(documentclass|usepackage|begin\{[^}]+\}|section\{[^}]+\}|subsection\{[^}]+\}|chapter\{[^}]+\}|input\{[^}]+\}|include\{[^}]+\}|newcommand\b)/,
    /^#(import|set|show|let)\b/,
    /^={1,6}\s+\S/,
    /^\s*(export\s+)?(async\s+)?function\s+\w+/,
    /^\s*(export\s+)?class\s+\w+/,
    /^\s*(const|let|var)\s+\w+\s*=\s*\(/,
    /^\s*(interface|type|enum|struct)\s+\w+/,
    /^\s*def\s+\w+/,
    /^\s*fn\s+\w+/,
  ]

  const matches: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!outlinePatterns.some((pattern) => pattern.test(trimmed))) continue
    matches.push(`${index + 1}: ${trimmed.slice(0, MAX_OUTLINE_LINE_CHARS)}`)
    if (matches.length >= MAX_OUTLINE_ITEMS) break
  }

  return matches
}

// ============================================================================
// Response Extraction
// ============================================================================

/**
 * Extract code from FIM-formatted LLM response
 * Handles streaming by extracting partial content as it arrives
 */
export function extractCodeFromFIM(opts: {
  text: string
  recentlyAddedTextLen: number
  midTag?: string
}): { code: string; isComplete: boolean } {
  const midTag = opts.midTag ?? DEFAULT_FIM_TAGS.midTag
  const { text } = opts

  // Primary: look for <SELECTION>...</SELECTION> tags
  const openTag = `<${midTag}>`
  const closeTag = `</${midTag}>`

  const openIdx = text.indexOf(openTag)
  if (openIdx !== -1) {
    const contentStart = openIdx + openTag.length
    const closeIdx = text.indexOf(closeTag, contentStart)

    if (closeIdx === -1) {
      // Tag opened but not closed yet - return partial content
      return { code: text.substring(contentStart), isComplete: false }
    }

    // Full content extracted
    return { code: text.substring(contentStart, closeIdx), isComplete: true }
  }

  // Fallback: if the model wrapped output in markdown code fences instead
  const fenceStart = text.indexOf('```')
  if (fenceStart !== -1) {
    const afterFence = text.indexOf('\n', fenceStart)
    if (afterFence !== -1) {
      const fenceEnd = text.indexOf('```', afterFence + 1)
      if (fenceEnd !== -1) {
        return { code: text.substring(afterFence + 1, fenceEnd), isComplete: true }
      }
      // Fence opened but not closed — return partial
      return { code: text.substring(afterFence + 1), isComplete: false }
    }
  }

  return { code: '', isComplete: false }
}

/**
 * Extract code from regular (non-FIM) response
 * Handles code blocks wrapped in triple backticks
 */
export function extractCodeFromRegular(opts: {
  text: string
  recentlyAddedTextLen: number
}): { code: string; isComplete: boolean } {
  const { text } = opts
  
  // Look for code block
  const codeBlockStart = text.indexOf('```')
  if (codeBlockStart === -1) {
    return { code: text, isComplete: false }
  }
  
  // Find the end of the first line (language identifier)
  const firstNewline = text.indexOf('\n', codeBlockStart)
  if (firstNewline === -1) {
    return { code: '', isComplete: false }
  }
  
  const contentStart = firstNewline + 1
  const codeBlockEnd = text.indexOf('```', contentStart)
  
  if (codeBlockEnd === -1) {
    // Code block started but not closed
    return { 
      code: text.substring(contentStart), 
      isComplete: false 
    }
  }
  
  return { 
    code: text.substring(contentStart, codeBlockEnd), 
    isComplete: true 
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the language ID for a file based on its extension or model
 */
export function getLanguageFromFile(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'js': 'javascript',
    'jsx': 'javascriptreact',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'json': 'json',
    'md': 'markdown',
    'tex': 'latex',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'yml': 'yaml',
    'yaml': 'yaml',
  }
  
  return languageMap[ext] ?? 'plaintext'
}

/**
 * Count number of lines in a string
 */
export function countLines(str: string): number {
  return str.split('\n').length
}
