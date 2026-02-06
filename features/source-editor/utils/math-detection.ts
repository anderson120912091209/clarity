/**
 * Math detection utilities for LaTeX and Typst.
 * Supported LaTeX delimiters:
 * - Inline: $...$
 * - Display: $$...$$, \[...\], \begin{equation}...\end{equation}, \begin{equation*}...\end{equation*}
 * Supported Typst delimiters:
 * - Inline/Display: $...$ (Typst determines block math based on surrounding whitespace)
 */

export type SupportedMathLanguage = 'latex' | 'typst'

export interface MathExpression {
  content: string
  startPos: number
  endPos: number
  displayMode: boolean
  lineNumber: number
  startColumn: number
  endColumn: number
}

interface MathDetectionOptions {
  languageId?: SupportedMathLanguage
}

interface RawMathRange {
  startPos: number
  endPos: number
  content: string
  displayMode: boolean
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0
  let cursor = index - 1
  while (cursor >= 0 && text[cursor] === '\\') {
    slashCount += 1
    cursor -= 1
  }
  return slashCount % 2 === 1
}

function buildLineStarts(text: string): number[] {
  const lineStarts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1)
    }
  }
  return lineStarts
}

function findLineIndex(lineStarts: number[], absolutePos: number): number {
  let left = 0
  let right = lineStarts.length - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const middleStart = lineStarts[middle]
    const nextStart = middle + 1 < lineStarts.length ? lineStarts[middle + 1] : Number.MAX_SAFE_INTEGER

    if (absolutePos >= middleStart && absolutePos < nextStart) {
      return middle
    }

    if (absolutePos < middleStart) {
      right = middle - 1
    } else {
      left = middle + 1
    }
  }

  return lineStarts.length - 1
}

function toMathExpression(
  range: RawMathRange,
  lineStarts: number[]
): MathExpression {
  const startLineIndex = findLineIndex(lineStarts, range.startPos)
  const endLineIndex = findLineIndex(lineStarts, Math.max(range.startPos, range.endPos - 1))

  return {
    content: range.content,
    startPos: range.startPos,
    endPos: range.endPos,
    displayMode: range.displayMode,
    lineNumber: startLineIndex + 1,
    startColumn: range.startPos - lineStarts[startLineIndex] + 1,
    endColumn: range.endPos - lineStarts[endLineIndex] + 1,
  }
}

function collectLatexDisplayRanges(text: string): RawMathRange[] {
  const ranges: RawMathRange[] = []
  const patterns = [
    /\$\$([\s\S]*?)\$\$/g,
    /\\\[([\s\S]*?)\\\]/g,
    /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const startPos = match.index
      const endPos = startPos + match[0].length
      const isOverlapping = ranges.some(
        (range) => startPos < range.endPos && endPos > range.startPos
      )
      if (isOverlapping) continue

      ranges.push({
        startPos,
        endPos,
        content: match[1].trim(),
        displayMode: true,
      })
    }
  }

  ranges.sort((a, b) => a.startPos - b.startPos)
  return ranges
}

function collectLatexInlineRanges(
  text: string,
  blockedRanges: RawMathRange[]
): RawMathRange[] {
  const ranges: RawMathRange[] = []
  let blockedIndex = 0

  for (let i = 0; i < text.length; i++) {
    while (blockedIndex < blockedRanges.length && i >= blockedRanges[blockedIndex].endPos) {
      blockedIndex += 1
    }

    if (
      blockedIndex < blockedRanges.length &&
      i >= blockedRanges[blockedIndex].startPos &&
      i < blockedRanges[blockedIndex].endPos
    ) {
      i = blockedRanges[blockedIndex].endPos - 1
      continue
    }

    if (text[i] !== '$' || isEscaped(text, i) || text[i + 1] === '$') {
      continue
    }

    let closingPos = -1
    for (let cursor = i + 1; cursor < text.length; cursor++) {
      const char = text[cursor]
      if (char === '\n') {
        break
      }
      if (char === '$' && !isEscaped(text, cursor) && text[cursor - 1] !== '$') {
        closingPos = cursor
        break
      }
    }

    if (closingPos === -1) continue

    const content = text.slice(i + 1, closingPos)
    if (content.trim().length === 0) {
      i = closingPos
      continue
    }

    ranges.push({
      startPos: i,
      endPos: closingPos + 1,
      content,
      displayMode: false,
    })

    i = closingPos
  }

  return ranges
}

function collectTypstMathRanges(text: string): RawMathRange[] {
  const ranges: RawMathRange[] = []

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '$' || isEscaped(text, i) || text[i + 1] === '$') {
      continue
    }

    let closingPos = -1
    for (let cursor = i + 1; cursor < text.length; cursor++) {
      if (text[cursor] === '$' && !isEscaped(text, cursor) && text[cursor + 1] !== '$') {
        closingPos = cursor
        break
      }
    }

    if (closingPos === -1) continue

    const rawContent = text.slice(i + 1, closingPos)
    if (rawContent.trim().length === 0) {
      i = closingPos
      continue
    }

    const isDisplayMode =
      (rawContent.length > 0 && /^\s/.test(rawContent) && /\s$/.test(rawContent)) ||
      rawContent.includes('\n')

    ranges.push({
      startPos: i,
      endPos: closingPos + 1,
      content: isDisplayMode ? rawContent.trim() : rawContent,
      displayMode: isDisplayMode,
    })

    i = closingPos
  }

  return ranges
}

function resolveMathLanguage(options?: MathDetectionOptions): SupportedMathLanguage {
  return options?.languageId === 'typst' ? 'typst' : 'latex'
}

/**
 * Find all math expressions in text for the selected language.
 */
export function findAllMathExpressions(
  text: string,
  options?: MathDetectionOptions
): MathExpression[] {
  const languageId = resolveMathLanguage(options)
  const lineStarts = buildLineStarts(text)

  let ranges: RawMathRange[] = []
  if (languageId === 'typst') {
    ranges = collectTypstMathRanges(text)
  } else {
    const latexDisplayRanges = collectLatexDisplayRanges(text)
    ranges = [
      ...latexDisplayRanges,
      ...collectLatexInlineRanges(text, latexDisplayRanges),
    ]
  }

  ranges.sort((a, b) => a.startPos - b.startPos)
  return ranges.map((range) => toMathExpression(range, lineStarts))
}

/**
 * Find a math expression at a specific absolute position.
 */
export function findMathAtPosition(
  text: string,
  position: number,
  options?: MathDetectionOptions
): MathExpression | null {
  const expressions = findAllMathExpressions(text, options)

  return (
    expressions.find(
      (expr) => position >= expr.startPos && position < expr.endPos
    ) || null
  )
}

/**
 * Get a math expression at a Monaco cursor position.
 */
export function getMathAtCursor(
  model: { getValue(): string },
  position: { lineNumber: number; column: number },
  options?: MathDetectionOptions
): MathExpression | null {
  const text = model.getValue()
  const lines = text.split('\n')

  let absolutePos = 0
  for (let i = 0; i < position.lineNumber - 1; i++) {
    absolutePos += lines[i].length + 1
  }
  absolutePos += position.column - 1

  return findMathAtPosition(text, absolutePos, options)
}

/**
 * Extract LaTeX command definitions from text
 */
export function extractCommandDefinitions(text: string): string[] {
  const definitions: string[] = []
  const commandDefRegex = /\\newcommand\s*\{?\\?(\w+)\}?\s*\[?\d*\]?\s*\{([^}]+)\}/g
  let match: RegExpExecArray | null

  while ((match = commandDefRegex.exec(text)) !== null) {
    definitions.push(match[0])
  }

  return definitions
}

/**
 * Extract environment definitions from text
 */
export function extractEnvironmentDefinitions(text: string): string[] {
  const definitions: string[] = []
  const envDefRegex = /\\newenvironment\s*\{(\w+)\}\s*\{([^}]+)\}\s*\{([^}]+)\}/g
  let match: RegExpExecArray | null

  while ((match = envDefRegex.exec(text)) !== null) {
    definitions.push(match[0])
  }

  return definitions
}
