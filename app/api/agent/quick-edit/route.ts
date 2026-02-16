import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import {
  checkFixedQuota,
  getFixedQuotaSnapshot,
  type FixedQuotaResult,
} from '@/lib/server/rate-limit'
import { buildQuickEditQuotaKey, QUICK_EDIT_CLIENT_QUOTA } from '@/lib/server/quick-edit-quota'

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

function attachQuotaHeaders(headers: Headers, quota: FixedQuotaResult) {
  headers.set('X-QuickEdit-Quota-Limit', String(quota.limit))
  headers.set('X-QuickEdit-Quota-Used', String(quota.used))
  headers.set('X-QuickEdit-Quota-Remaining', String(quota.remaining))
  headers.set('X-QuickEdit-Quota-Store', quota.store)
}

function createQuotaResponse(
  body: BodyInit | null,
  init: ResponseInit,
  quota: FixedQuotaResult
): Response {
  const headers = new Headers(init.headers)
  attachQuotaHeaders(headers, quota)
  return new Response(body, { ...init, headers })
}

export async function GET(req: Request) {
  const quota = await getFixedQuotaSnapshot({
    key: buildQuickEditQuotaKey(req),
    limit: QUICK_EDIT_CLIENT_QUOTA,
  })

  return Response.json({
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    allowed: quota.allowed,
    store: quota.store,
  })
}

export async function POST(req: Request) {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `qe-${Date.now()}`
  const quota = await checkFixedQuota({
    key: buildQuickEditQuotaKey(req),
    limit: QUICK_EDIT_CLIENT_QUOTA,
  })

  if (!quota.allowed) {
    return createQuotaResponse(
      'Quick edit quota reached for this client (20 total requests).',
      { status: 429 },
      quota
    )
  }

  let payload: QuickEditRequestBody
  try {
    payload = (await req.json()) as QuickEditRequestBody
  } catch {
    return createQuotaResponse('Invalid request payload', { status: 400 }, quota)
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return createQuotaResponse('Invalid quick edit messages payload', { status: 400 }, quota)
  }

  const conversation = normalizeConversationMessages(payload.messages)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return createQuotaResponse(
      'A user message is required to start quick edit generation',
      { status: 400 },
      quota
    )
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY
  if (!apiKey) {
    return createQuotaResponse('Missing Google API Key', { status: 401 }, quota)
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

    const streamResponse = result.toTextStreamResponse()
    return createQuotaResponse(
      streamResponse.body,
      {
        status: streamResponse.status,
        statusText: streamResponse.statusText,
        headers: streamResponse.headers,
      },
      quota
    )
  } catch (error) {
    console.error(`[Agent QuickEdit ${requestId}] Error:`, error)
    return createQuotaResponse('Internal Server Error', { status: 500 }, quota)
  }
}
