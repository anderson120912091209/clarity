interface BuildLatexAutoDebugPromptInput {
  compileError: string
  activeFilePath?: string | null
}

function trimError(error: string, maxChars: number): string {
  const normalized = error.trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, maxChars)}\n\n[Truncated]`
}

export function buildLatexAutoDebugPrompt(input: BuildLatexAutoDebugPromptInput): string {
  const errorSummary = trimError(input.compileError, 6000)
  const activeFileHint = input.activeFilePath?.trim()
    ? `Active file hint: ${input.activeFilePath}`
    : 'Active file hint: (not provided)'

  return [
    'ONE-CLICK LATEX DEBUG MODE',
    '',
    'You are running an automated compile-debug workflow. Follow this sequence strictly:',
    '1. Call `get_compile_logs` immediately.',
    '2. Identify the most likely root cause of the compile failure from the logs.',
    '3. Read only the minimal necessary files using workspace tools.',
    '4. Apply a minimal fix using one or more `apply_file_edit` tool calls.',
    '5. Return a concise summary with:',
    '   - root cause',
    '   - files edited',
    '   - what changed',
    '   - what to verify with next compile',
    '',
    'Constraints:',
    '- Prefer minimal, targeted edits over broad rewrites.',
    '- Do not make speculative refactors unrelated to the compile error.',
    '- If no safe fix is possible, explain exactly what is missing and stop.',
    '',
    activeFileHint,
    '',
    'Current compile error snapshot:',
    '```',
    errorSummary,
    '```',
  ].join('\n')
}
