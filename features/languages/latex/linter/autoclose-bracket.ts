/**
 * Auto-closing bracket extension for Monaco Editor
 * Implements LaTeX-specific bracket auto-closing logic similar to Overleaf
 */

import * as monaco from 'monaco-editor'

interface BracketPair {
  open: string
  close: string
}

const BRACKET_PAIRS: BracketPair[] = [
  { open: '$', close: '$' },
  { open: '$$', close: '$$' },
  { open: '[', close: ']' },
  { open: '{', close: '}' },
  { open: '(', close: ')' },
]

/**
 * Get character at a specific position in the model
 */
function getCharAt(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): string | null {
  const lineContent = model.getLineContent(position.lineNumber)
  if (position.column > lineContent.length) {
    return null
  }
  return lineContent[position.column - 1] || null
}

/**
 * Get character before a position
 */
function getPrevChar(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): string | null {
  if (position.column === 1) {
    // Check previous line
    if (position.lineNumber === 1) return null
    const prevLine = model.getLineContent(position.lineNumber - 1)
    return prevLine[prevLine.length - 1] || null
  }
  return getCharAt(model, new monaco.Position(position.lineNumber, position.column - 1))
}

/**
 * Get character after a position
 */
function getNextChar(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): string | null {
  const lineContent = model.getLineContent(position.lineNumber)
  if (position.column > lineContent.length) {
    // Check next line
    if (position.lineNumber >= model.getLineCount()) return null
    const nextLine = model.getLineContent(position.lineNumber + 1)
    return nextLine[0] || null
  }
  return getCharAt(model, new monaco.Position(position.lineNumber, position.column + 1))
}

/**
 * Count surrounding characters (for $ detection)
 */
function countSurroundingCharacters(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  char: string
): number {
  let count = 0
  const lineContent = model.getLineContent(position.lineNumber)
  
  // Count backwards
  let col = position.column - 1
  while (col >= char.length) {
    const substr = lineContent.substring(col - char.length, col)
    if (substr !== char) break
    count++
    col -= char.length
  }
  
  // Count forwards
  // Start AFTER the current inserted character(s)
  // position points to the start of the inserted character
  // So we skip 'char.length' to avoid counting the one we just inserted
  col = (position.column - 1) + char.length
  while (col + char.length <= lineContent.length) {
    const substr = lineContent.substring(col, col + char.length)
    if (substr !== char) break
    count++
    col += char.length
  }
  
  return count
}

/**
 * Build the insert text based on LaTeX-specific rules
 */
function buildInsert(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  open: string,
  close: string
): string {
  switch (open) {
    case '$': {
      const prev = getPrevChar(model, position)
      if (prev === '\\') {
        const prevPos = new monaco.Position(
          position.lineNumber,
          position.column - 1
        )
        const preprev = getPrevChar(model, prevPos)
        // add an unprefixed closing dollar to \\$
        if (preprev === '\\') {
          return open + '$'
        }
        // don't auto-close \$
        return open
      }

      const next = getNextChar(model, position)
      if (next === '\\') {
        // avoid auto-closing $ before a TeX command
        const nextPos = new monaco.Position(
          position.lineNumber,
          position.column + 1
        )
        const postnext = getNextChar(model, nextPos)
        
        // Check if it's a word character (part of command)
        if (postnext && /[a-zA-Z]/.test(postnext)) {
          // don't auto-close $\command
          return open
        }
        return open + '$'
      }

      // avoid creating an odd number of dollar signs
      const count = countSurroundingCharacters(model, position, open)
      if (count % 2 !== 0) {
        return open
      }
      return open + close
    }

    case '[': {
      const prev = getPrevChar(model, position)
      if (prev === '\\') {
        const prevPos = new monaco.Position(
          position.lineNumber,
          position.column - 1
        )
        const preprev = getPrevChar(model, prevPos)
        // add an unprefixed closing bracket to \\[
        if (preprev === '\\') {
          return open + ']'
        }
        // auto-close \[ with \]
        return open + '\\' + close
      }
      return open + close
    }

    case '(': {
      const prev = getPrevChar(model, position)
      if (prev === '\\') {
        const prevPos = new monaco.Position(
          position.lineNumber,
          position.column - 1
        )
        const preprev = getPrevChar(model, prevPos)
        // don't auto-close \\(
        if (preprev === '\\') {
          return open
        }
        // auto-close \( with \)
        return open + '\\' + close
      }
      // Don't auto-close regular ( in LaTeX context
      return open
    }

    case '{': {
      const prev = getPrevChar(model, position)
      if (prev === '\\') {
        const prevPos = new monaco.Position(
          position.lineNumber,
          position.column - 1
        )
        const preprev = getPrevChar(model, prevPos)
        // add an unprefixed closing bracket to \\{
        if (preprev === '\\') {
          return open + '}'
        }
        // don't auto-close \{
        return open
      }
      return open + close
    }

    default:
      return open + close
  }
}

/**
 * Setup auto-closing brackets for LaTeX
 */
export function setupAutoCloseBrackets(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco
): monaco.IDisposable {
  // Disable default auto-closing to use our custom logic
  editor.updateOptions({
    autoClosingBrackets: 'never',
    autoClosingQuotes: 'never',
  })

  let isProcessing = false

  // Custom handler for LaTeX-specific bracket logic
  const disposable = editor.onDidChangeModelContent((e) => {
    // Prevent infinite loops
    if (isProcessing) return

    const model = editor.getModel()
    if (!model) return

    // Only process if it's a single character insertion (not deletion)
    if (e.changes.length !== 1) return

    const change = e.changes[0]
    const insertedText = change.text

    // Skip if this is a deletion (text length is 0 or range is not empty)
    if (!insertedText || insertedText.length === 0) return
    
    // Check if range is empty (single character insertion, no selection replacement)
    const range = change.range
    if (
      range.startLineNumber !== range.endLineNumber ||
      range.startColumn !== range.endColumn
    ) {
      return // Not an empty range replacement, likely a paste or selection overwrite
    }

    // Check if a bracket was typed
    const bracketPair = BRACKET_PAIRS.find((pair) => insertedText === pair.open)
    if (!bracketPair) return

    // Get the position BEFORE the bracket was inserted
    // Since we're in onDidChangeModelContent, the content is already inserted.
    // The insertion happened at change.range.startLineNumber, change.range.startColumn
    const positionBeforeInsert = new monacoInstance.Position(
      change.range.startLineNumber,
      change.range.startColumn
    )

    // Check if we should auto-close
    const insertText = buildInsert(model, positionBeforeInsert, bracketPair.open, bracketPair.close)

    // If we need to insert a closing bracket
    if (insertText.length > bracketPair.open.length) {
      const closingBracket = insertText.substring(bracketPair.open.length)

      isProcessing = true

      // Use setTimeout to insert after Monaco processes the current edit
      setTimeout(() => {
        const currentPosition = editor.getPosition()
        if (!currentPosition) {
          isProcessing = false
          return
        }

        // Expected position is AFTER the opening bracket
        // We calculate where the cursor should be if the user just typed the opening bracket
        const expectedLine = change.range.startLineNumber
        const expectedCol = change.range.startColumn + insertedText.length

        // Check if cursor is at the expected position (right after the opening bracket)
        if (
          currentPosition.lineNumber === expectedLine &&
          currentPosition.column === expectedCol
        ) {
          // Insert the closing bracket
          editor.executeEdits('auto-close-bracket', [
            {
              range: new monacoInstance.Range(
                currentPosition.lineNumber,
                currentPosition.column,
                currentPosition.lineNumber,
                currentPosition.column
              ),
              text: closingBracket,
              forceMoveMarkers: true,
            },
          ])

          // Move cursor back between the brackets
          // Since forceMoveMarkers is true, cursor likely moved after closing bracket.
          // We want it between.
          editor.setPosition({
              lineNumber: currentPosition.lineNumber,
              column: currentPosition.column 
          })
        }

        isProcessing = false
      }, 0)
    }
  })

  return disposable
}

