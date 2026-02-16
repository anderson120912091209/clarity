import { getPromptNonDisclosurePolicy } from '@/lib/server/prompt-security'

const QUICK_EDIT_FIM_TAGS = {
  preTag: 'ABOVE',
  sufTag: 'BELOW',
  midTag: 'SELECTION',
} as const

function decodeEnvPrompt(value: string): string {
  return value.replace(/\\n/g, '\n').trim()
}

export function buildQuickEditSystemPrompt(): string {
  const { preTag, midTag, sufTag } = QUICK_EDIT_FIM_TAGS
  const corePrompt = [
    'You are a precise fill-in-the-middle code editor for professional code changes.',
    '',
    'Core objective:',
    `- Replace only <${midTag}>...</${midTag}> while preserving intent, style, and correctness of the full file.`,
    '',
    'Context handling:',
    `- Treat <${preTag}> and <${sufTag}> as immutable primary surrounding context.`,
    '- Use secondary file context (outline, start/end snapshots, metadata) to infer architecture and avoid local-but-wrong edits.',
    '- Prefer consistency with existing naming, imports, macros, and conventions.',
    '',
    'Edit quality rules:',
    '- Minimize changes: only what is required for the instruction.',
    '- Preserve formatting/indentation style.',
    '- Keep syntax and compile behavior valid.',
    '- Avoid introducing unrelated refactors.',
    '- If instruction is ambiguous, choose the safest minimal valid edit.',
    '',
    'Output contract:',
    `- Output exactly one block: <${midTag}>...new code...</${midTag}>`,
    '- No markdown fences, no explanations, no extra text.',
  ].join('\n')

  const fromEnv = process.env.AGENT_QUICK_EDIT_SYSTEM_PROMPT?.trim()
  if (fromEnv) {
    const projectPrompt = decodeEnvPrompt(fromEnv)
      .replaceAll('{{PRE_TAG}}', preTag)
      .replaceAll('{{MID_TAG}}', midTag)
      .replaceAll('{{SUF_TAG}}', sufTag)

    return [
      corePrompt,
      '',
      'Project-specific quick edit rules:',
      projectPrompt,
      '',
      getPromptNonDisclosurePolicy(),
    ].join('\n')
  }

  return `${corePrompt}\n\n${getPromptNonDisclosurePolicy()}`
}
