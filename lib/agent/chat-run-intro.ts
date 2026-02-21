interface BuildAgentRunIntroOptions {
  prompt: string
  compileError?: string | null
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function buildAgentRunIntro(options: BuildAgentRunIntroOptions): string {
  const compileError = compactWhitespace(options.compileError ?? '')
  if (compileError) {
    const truncatedError =
      compileError.length > 220 ? `${compileError.slice(0, 217)}...` : compileError
    return [
      `I found a compilation issue: ${truncatedError}`,
      'I will inspect the relevant files and logs first, then apply the smallest safe fix.',
    ].join('\n')
  }

  const prompt = compactWhitespace(options.prompt).toLowerCase()
  const looksLikeDebugRequest =
    /\b(debug|diagnose|investigate|fix|error|exception|stack trace|compile|build fail)\b/.test(
      prompt
    )

  if (!looksLikeDebugRequest) return ''

  return [
    'I will diagnose the issue first and then run targeted tool calls.',
    'After applying edits, I will summarize exactly what changed and why.',
  ].join('\n')
}
