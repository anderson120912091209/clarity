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

  const fromEnv = process.env.AGENT_QUICK_EDIT_SYSTEM_PROMPT?.trim()
  if (fromEnv) {
    const prompt = decodeEnvPrompt(fromEnv)
      .replaceAll('{{PRE_TAG}}', preTag)
      .replaceAll('{{MID_TAG}}', midTag)
      .replaceAll('{{SUF_TAG}}', sufTag)
    return `${prompt}\n\n${getPromptNonDisclosurePolicy()}`
  }

  const fallbackPrompt = [
    `You are a FIM coding assistant. Fill only content inside <${midTag}>...</${midTag}>.`,
    `Do not modify text inside <${preTag}>...</${preTag}> or <${sufTag}>...</${sufTag}>.`,
    `Output only a single code block wrapped in <${midTag}>...</${midTag}>.`,
  ].join('\n')

  return `${fallbackPrompt}\n\n${getPromptNonDisclosurePolicy()}`
}
