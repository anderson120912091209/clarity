/**
 * File Edit Validator
 *
 * Pre-edit and post-edit validation for LaTeX and Typst documents.
 * Catches common structural issues before they reach the user.
 */

export interface EditValidation {
  valid: boolean
  warnings: string[]
  errors: string[]
}

// ── LaTeX Validation ──

function validateLatexBalance(content: string): string[] {
  const errors: string[] = []

  // Check braces balance
  let braceDepth = 0
  let inComment = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '%' && (i === 0 || content[i - 1] !== '\\')) {
      inComment = true
      continue
    }
    if (ch === '\n') {
      inComment = false
      continue
    }
    if (inComment) continue

    if (ch === '{' && (i === 0 || content[i - 1] !== '\\')) braceDepth++
    if (ch === '}' && (i === 0 || content[i - 1] !== '\\')) braceDepth--

    if (braceDepth < 0) {
      errors.push('Unmatched closing brace found')
      break
    }
  }
  if (braceDepth > 0) {
    errors.push(`${braceDepth} unclosed brace(s) detected`)
  }

  // Check begin/end environment balance
  const beginMatches = content.match(/\\begin\{([^}]+)\}/g) ?? []
  const endMatches = content.match(/\\end\{([^}]+)\}/g) ?? []

  const beginCounts = new Map<string, number>()
  const endCounts = new Map<string, number>()

  for (const match of beginMatches) {
    const env = match.replace(/\\begin\{|\}/g, '')
    beginCounts.set(env, (beginCounts.get(env) ?? 0) + 1)
  }
  for (const match of endMatches) {
    const env = match.replace(/\\end\{|\}/g, '')
    endCounts.set(env, (endCounts.get(env) ?? 0) + 1)
  }

  for (const [env, count] of beginCounts) {
    const endCount = endCounts.get(env) ?? 0
    if (count > endCount) {
      errors.push(`Missing \\end{${env}} (${count} begin vs ${endCount} end)`)
    }
  }
  for (const [env, count] of endCounts) {
    const beginCount = beginCounts.get(env) ?? 0
    if (count > beginCount) {
      errors.push(`Extra \\end{${env}} (${beginCount} begin vs ${count} end)`)
    }
  }

  return errors
}

// ── Typst Validation ──

function validateTypstBalance(content: string): string[] {
  const errors: string[] = []

  // Check curly brace balance (Typst uses them for blocks)
  let braceDepth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]

    // Handle strings
    if ((ch === '"') && !inString) {
      inString = true
      stringChar = ch
      continue
    }
    if (ch === stringChar && inString && content[i - 1] !== '\\') {
      inString = false
      continue
    }
    if (inString) continue

    // Handle line comments
    if (ch === '/' && content[i + 1] === '/') {
      const newline = content.indexOf('\n', i)
      if (newline === -1) break
      i = newline
      continue
    }

    if (ch === '{') braceDepth++
    if (ch === '}') braceDepth--

    if (braceDepth < 0) {
      errors.push('Unmatched closing brace found in Typst')
      break
    }
  }
  if (braceDepth > 0) {
    errors.push(`${braceDepth} unclosed brace(s) detected in Typst`)
  }

  return errors
}

// ── Public API ──

export function validateEdit(opts: {
  filePath: string
  content: string
}): EditValidation {
  const { filePath, content } = opts
  const warnings: string[] = []
  const errors: string[] = []

  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

  if (['tex', 'sty', 'cls'].includes(ext)) {
    errors.push(...validateLatexBalance(content))
  } else if (ext === 'typ') {
    errors.push(...validateTypstBalance(content))
  }

  // Check for suspiciously empty content
  if (content.trim().length === 0) {
    warnings.push('File content is empty after edit')
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

export function validateEditDelta(opts: {
  filePath: string
  originalContent: string
  proposedContent: string
}): EditValidation {
  const { filePath, originalContent, proposedContent } = opts

  // Validate the proposed content
  const result = validateEdit({ filePath, content: proposedContent })

  // Check for large content reduction
  if (
    originalContent.length > 100 &&
    proposedContent.length < Math.floor(originalContent.length * 0.25)
  ) {
    result.warnings.push(
      `Edit reduces content by >75% (${originalContent.length} → ${proposedContent.length} chars)`
    )
  }

  // Check if the original had the same issues (don't blame the edit for pre-existing problems)
  const originalValidation = validateEdit({ filePath, content: originalContent })
  const preExistingErrors = new Set(originalValidation.errors.map((e) => e))
  result.errors = result.errors.filter((e) => !preExistingErrors.has(e))

  return result
}
