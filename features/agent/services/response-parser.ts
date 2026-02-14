/**
 * Response Parser - Fallback parser for raw @file: / @insert: metadata
 *
 * When the AI uses the apply_file_edit tool correctly, this is not needed.
 * However, if the AI occasionally outputs raw metadata in its text response,
 * this parser extracts it and returns clean display text + structured edits.
 */

export interface ParsedFileEdit {
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent: string | null
  replaceContent: string
  description: string
}

export interface ParsedResponse {
  /** Clean text with all edit metadata removed */
  displayText: string
  /** Extracted file edits from raw metadata */
  fileEdits: ParsedFileEdit[]
}

/**
 * Pattern to match a fenced code block preceded by @file: and @insert: metadata.
 *
 * Example:
 * ```
 * @file: main.tex
 * @insert: search_replace
 * ```latex
 * SEARCH:
 * \usepackage{amsmath}
 * REPLACE:
 * \usepackage{amsmath}
 * \usepackage{booktabs}
 * ```
 */
const EDIT_BLOCK_PATTERN =
  /@file:\s*(.+?)\s*\n\s*@insert:\s*(search_replace|replace_file|replace|after_line\s+\d+|before_line\s+\d+|line\s+\d+|after\s+.+?|before\s+.+?|append)\s*\n\s*```[\w]*\n([\s\S]*?)```/g

const SEARCH_REPLACE_PATTERN = /SEARCH:\s*\n([\s\S]*?)\nREPLACE:\s*\n([\s\S]*?)$/

/**
 * Parse raw AI response text for embedded edit metadata.
 * Extracts @file:/@insert: blocks and returns clean text + structured edits.
 */
export function parseRawResponse(content: string): ParsedResponse {
  const fileEdits: ParsedFileEdit[] = []
  let displayText = content

  // Reset regex state
  EDIT_BLOCK_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  const blocksToRemove: Array<{ start: number; end: number }> = []

  while ((match = EDIT_BLOCK_PATTERN.exec(content)) !== null) {
    const filePath = match[1].trim()
    const insertType = match[2].trim().toLowerCase()
    const codeContent = match[3]

    if (insertType === 'search_replace') {
      const srMatch = SEARCH_REPLACE_PATTERN.exec(codeContent)
      if (srMatch) {
        fileEdits.push({
          filePath,
          editType: 'search_replace',
          searchContent: srMatch[1].trim(),
          replaceContent: srMatch[2].trim(),
          description: `Edit ${filePath} (search & replace)`,
        })
      }
    } else if (insertType === 'replace_file' || insertType === 'replace') {
      fileEdits.push({
        filePath,
        editType: 'replace_file',
        searchContent: null,
        replaceContent: codeContent.trim(),
        description: `Replace ${filePath}`,
      })
    } else {
      // Other insert types (after_line, before_line, append, etc.) → treat as replace_file
      fileEdits.push({
        filePath,
        editType: 'replace_file',
        searchContent: null,
        replaceContent: codeContent.trim(),
        description: `Edit ${filePath} (${insertType})`,
      })
    }

    blocksToRemove.push({
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // Remove matched blocks from display text (in reverse order to preserve indices)
  for (const block of blocksToRemove.reverse()) {
    displayText = displayText.slice(0, block.start) + displayText.slice(block.end)
  }

  // Clean up excessive whitespace left behind
  displayText = displayText.replace(/\n{3,}/g, '\n\n').trim()

  return { displayText, fileEdits }
}

/**
 * Strip just the @file:/@insert: metadata lines from text,
 * leaving fenced code blocks intact for display.
 * Used when we want to show code but hide the metadata lines.
 */
export function stripEditMetadataLines(content: string): string {
  return content
    .replace(/@file:\s*.+?\s*\n/g, '')
    .replace(/@insert:\s*.+?\s*\n/g, '')
    .replace(/^SEARCH:\s*$/gm, '')
    .replace(/^REPLACE:\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
