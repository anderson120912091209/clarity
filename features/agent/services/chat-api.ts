import type { PanelMessage } from '@/features/agent/types/chat.types'
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'

type AgentRole = 'user' | 'assistant'

function resolveApiUrl(pathname: string): string {
  if (typeof window !== 'undefined') {
    return pathname
  }

  const configuredBase =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL

  if (!configuredBase) {
    const port = process.env.PORT || '3000'
    return `http://localhost:${port}${pathname}`
  }

  const baseWithProtocol = configuredBase.startsWith('http')
    ? configuredBase
    : `https://${configuredBase}`

  return `${baseWithProtocol.replace(/\/+$/, '')}${pathname}`
}

function normalizeMessages(messages: PanelMessage[]): Array<{ role: AgentRole; content: string }> {
  return messages
    .filter((message) => {
      const isValidRole = message.role === 'user' || message.role === 'assistant'
      return isValidRole && typeof message.content === 'string' && message.content.trim().length > 0
    })
    .map((message) => ({
      role: message.role as AgentRole,
      content: message.content.trim(),
    }))
}

async function readStreamAsText(response: Response): Promise<string> {
  if (!response.body) {
    return response.text()
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let output = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      output += decoder.decode(value, { stream: true })
    }
    output += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  return output
}

function extractAiSdkText(raw: string): string {
  const textChunks: string[] = []

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('0:')) continue

    try {
      const payload = JSON.parse(trimmed.slice(2)) as string
      if (typeof payload === 'string') {
        textChunks.push(payload)
      }
    } catch {
      // Ignore malformed lines and continue best-effort extraction.
    }
  }

  return textChunks.join('')
}

export async function chat(messages: PanelMessage[], context: string): Promise<string> {
  const normalizedMessages = normalizeMessages(messages)
  const trimmedContext = context.trim()

  if (trimmedContext.length > 0) {
    normalizedMessages.unshift({
      role: 'user',
      content: `Context:\n${trimmedContext}`,
    })
  }

  const response = await fetch(resolveApiUrl('/api/agent/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: normalizedMessages }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Agent chat request failed: ${response.status} ${response.statusText}\n${errorBody}`)
  }

  const raw = await readStreamAsText(response)
  return extractAiSdkText(raw)
}

export async function generate(input: string): Promise<string> {
  const prompt = input.trim()
  if (!prompt) return ''

  const response = await fetch(resolveApiUrl('/api/agent/quick-edit'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...readRuntimeUserHeaders(),
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(
      `Quick edit request failed: ${response.status} ${response.statusText}\n${errorBody}`
    )
  }

  return readStreamAsText(response)
}
