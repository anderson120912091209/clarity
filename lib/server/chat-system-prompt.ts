import { getPromptNonDisclosurePolicy } from '@/lib/server/prompt-security'

function decodeEnvPrompt(value: string): string {
  return value.replace(/\\n/g, '\n').trim()
}

export function getChatBaseSystemPrompt(): string {
  const fromEnv = process.env.AGENT_CHAT_SYSTEM_PROMPT?.trim()
  if (fromEnv) return `${decodeEnvPrompt(fromEnv)}\n\n${getPromptNonDisclosurePolicy()}`

  const fallbackBase = [
    'You are a LaTeX and Typst coding assistant.',
    'Provide concise and correct answers.',
    'For file changes, use available edit tools instead of pseudo patch text.',
  ].join('\n')

  return `${fallbackBase}\n\n${getPromptNonDisclosurePolicy()}`
}
