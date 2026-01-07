/**
 * Math detection utilities for LaTeX
 * Detects inline math ($...$), display math (\[...\]), and equation environments
 */

export interface MathExpression {
  content: string
  startPos: number
  endPos: number
  displayMode: boolean
  lineNumber: number
  startColumn: number
  endColumn: number
}

/**
 * Find all math expressions in LaTeX text
 */
export function findAllMathExpressions(text: string): MathExpression[] {
  const expressions: MathExpression[] = []
  const lines = text.split('\n')
  let currentPos = 0

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    const lineStartPos = currentPos

    // Match inline math: $...$ (non-greedy)
    const inlineMathRegex = /\$([^$\n]+?)\$/g
    let match: RegExpExecArray | null

    while ((match = inlineMathRegex.exec(line)) !== null) {
      const startPos = lineStartPos + match.index
      const endPos = startPos + match[0].length
      expressions.push({
        content: match[1],
        startPos,
        endPos,
        displayMode: false,
        lineNumber: lineIdx + 1,
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
      })
    }

    // Match display math: \[...\]
    const displayMathRegex = /\\\[([\s\S]*?)\\\]/g
    while ((match = displayMathRegex.exec(line)) !== null) {
      const startPos = lineStartPos + match.index
      const endPos = startPos + match[0].length
      expressions.push({
        content: match[1].trim(),
        startPos,
        endPos,
        displayMode: true,
        lineNumber: lineIdx + 1,
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
      })
    }

    // Match equation environments: \begin{equation}...\end{equation}
    const equationRegex = /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g
    while ((match = equationRegex.exec(line)) !== null) {
      const startPos = lineStartPos + match.index
      const endPos = startPos + match[0].length
      expressions.push({
        content: match[1].trim(),
        startPos,
        endPos,
        displayMode: true,
        lineNumber: lineIdx + 1,
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
      })
    }

    currentPos += line.length + 1 // +1 for newline
  }

  return expressions
}

/**
 * Find math expression at a specific position
 */
export function findMathAtPosition(
  text: string,
  position: number
): MathExpression | null {
  const expressions = findAllMathExpressions(text)
  
  return (
    expressions.find(
      (expr) => position >= expr.startPos && position <= expr.endPos
    ) || null
  )
}

/**
 * Get math expression at cursor position (Monaco editor position)
 */
export function getMathAtCursor(
  model: { getValue(): string },
  position: { lineNumber: number; column: number }
): MathExpression | null {
  const text = model.getValue()
  const lines = text.split('\n')
  
  // Calculate absolute position
  let absolutePos = 0
  for (let i = 0; i < position.lineNumber - 1; i++) {
    absolutePos += lines[i].length + 1 // +1 for newline
  }
  absolutePos += position.column - 1

  return findMathAtPosition(text, absolutePos)
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

