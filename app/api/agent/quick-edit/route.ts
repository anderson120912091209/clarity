import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'

export const runtime = 'nodejs'

interface QuickEditRequestBody {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model?: string
}

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeConversationMessages(messages: QuickEditRequestBody['messages']): CoreMessage[] {
  const conversation: CoreMessage[] = []

  for (const message of messages) {
    const content = sanitizeText(message.content)
    if (!content) continue
    if (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') {
      continue
    }

    conversation.push({
      role: message.role,
      content,
    })
  }

  return conversation
}

function shouldRetryWithDefaultModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|not supported/i.test(message)
}

export async function POST(req: Request) {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `qe-${Date.now()}`

  let payload: QuickEditRequestBody
  try {
    payload = (await req.json()) as QuickEditRequestBody
  } catch {
    return new Response('Invalid request payload', { status: 400 })
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return new Response('Invalid quick edit messages payload', { status: 400 })
  }

  const conversation = normalizeConversationMessages(payload.messages)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return new Response('A user message is required to start quick edit generation', { status: 400 })
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY
  if (!apiKey) {
    return new Response('Missing Google API Key', { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const selectedModel = resolveGeminiModel(payload.model)

  const runWithModel = (modelId: string) =>
    streamText({
      model: google(modelId),
      messages: conversation,
      temperature: 0,
      maxTokens: 2048,
    })

  try {
    let result
    try {
      result = await runWithModel(selectedModel)
    } catch (modelError) {
      if (selectedModel === GEMINI_DEFAULT_MODEL || !shouldRetryWithDefaultModel(modelError)) {
        throw modelError
      }

      console.warn(
        `[Agent QuickEdit ${requestId}] Model "${selectedModel}" failed, retrying with default "${GEMINI_DEFAULT_MODEL}".`
      )
      result = await runWithModel(GEMINI_DEFAULT_MODEL)
    }

    return result.toTextStreamResponse()
  } catch (error) {
    console.error(`[Agent QuickEdit ${requestId}] Error:`, error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
