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

const MAX_PREFIX_SUFFIX_CHARS = 2000  // Limit context to avoid token limits
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
  instructions: string
  fimTags?: FIMTags
  language: string
}): string {
  const { selection, prefix, suffix, instructions, language } = opts
  const fimTags = opts.fimTags ?? DEFAULT_FIM_TAGS
  const { preTag, sufTag, midTag } = fimTags
  
  return `\

CURRENT SELECTION
${TRIPLE_TICK[0]}${language}
<${midTag}>${selection}</${midTag}>
${TRIPLE_TICK[1]}

INSTRUCTIONS
${instructions}

<${preTag}>${prefix}</${preTag}>
<${sufTag}>${suffix}</${sufTag}>

Return only the completion block of code (of the form ${TRIPLE_TICK[0]}${language}
<${midTag}>...new code</${midTag}>
${TRIPLE_TICK[1]}).`
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
}): { prefix: string; suffix: string } {
  const { fullFileStr, startLine, endLine } = opts
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
  
  return { prefix, suffix }
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
  
  // Look for opening tag
  const openTag = `<${midTag}>`
  const closeTag = `</${midTag}>`
  
  const openIdx = text.indexOf(openTag)
  if (openIdx === -1) {
    return { code: '', isComplete: false }
  }
  
  const contentStart = openIdx + openTag.length
  const closeIdx = text.indexOf(closeTag, contentStart)
  
  if (closeIdx === -1) {
    // Tag opened but not closed yet - return partial content
    return { 
      code: text.substring(contentStart), 
      isComplete: false 
    }
  }
  
  // Full content extracted
  return { 
    code: text.substring(contentStart, closeIdx), 
    isComplete: true 
  }
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
