import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import { authorizeAgentRequest } from '@/lib/server/agent-auth'
import { evaluatePromptSecurity } from '@/lib/server/prompt-security'
import { buildQuickEditSystemPrompt } from '@/lib/server/quick-edit-system-prompt'
import {
  checkFixedQuota,
  getFixedQuotaSnapshot,
  type FixedQuotaResult,
} from '@/lib/server/rate-limit'
import { buildQuickEditQuotaKey } from '@/lib/server/quick-edit-quota'
import { getSubscriptionEntitlements } from '@/lib/subscription/entitlements'

export const runtime = 'nodejs'

interface QuickEditRequestBody {
  messages: Array<{
    role: string
    content: string
  }>
  model?: string
}

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeConversationMessages(
  messages: QuickEditRequestBody['messages']
): { conversation: CoreMessage[]; rejectedSystemMessages: number } {
  const conversation: CoreMessage[] = []
  let rejectedSystemMessages = 0

  for (const message of messages) {
    const content = sanitizeText(message.content)
    if (!content) continue
    if (message.role === 'system') {
      rejectedSystemMessages += 1
      continue
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      continue
    }

    conversation.push({
      role: message.role,
      content,
    })
  }

  return { conversation, rejectedSystemMessages }
}

function extractTextContent(content: CoreMessage['content']): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  type TextPart = { type: 'text'; text: string }
  return content
    .filter((part): part is TextPart => {
      if (!part || typeof part !== 'object') return false
      const candidate = part as { type?: unknown; text?: unknown }
      return candidate.type === 'text' && typeof candidate.text === 'string'
    })
    .map((part) => part.text)
    .join('\n')
}

function extractQuickEditInstructionForSecurity(message: string): string {
  const startToken = 'INSTRUCTIONS\n'
  const endToken = '\n\nPRIMARY SURROUNDING CONTEXT'

  const startIndex = message.indexOf(startToken)
  if (startIndex < 0) return message

  const instructionStart = startIndex + startToken.length
  const endIndex = message.indexOf(endToken, instructionStart)
  if (endIndex < 0) return message.slice(instructionStart).trim()

  return message.slice(instructionStart, endIndex).trim()
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

function sanitizeHeaderValue(value: string | null): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length > 200) return null
  return normalized
}

function resolveQuickEditQuotaContext(req: Request): {
  userId: string | null
  quotaLimit: number
} {
  const userId = sanitizeHeaderValue(req.headers.get('x-clarity-user-id'))
  const plan = sanitizeHeaderValue(req.headers.get('x-clarity-user-plan'))
  const quotaLimit = getSubscriptionEntitlements(plan).quickEditQuotaLimit

  return { userId, quotaLimit }
}

export async function GET(req: Request) {
  const quotaContext = resolveQuickEditQuotaContext(req)
  const quota = await getFixedQuotaSnapshot({
    key: buildQuickEditQuotaKey(req, { userId: quotaContext.userId }),
    limit: quotaContext.quotaLimit,
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
  const authError = authorizeAgentRequest(req)
  if (authError) return authError

  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `qe-${Date.now()}`
  const quotaContext = resolveQuickEditQuotaContext(req)
  const quota = await checkFixedQuota({
    key: buildQuickEditQuotaKey(req, { userId: quotaContext.userId }),
    limit: quotaContext.quotaLimit,
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

  const { conversation, rejectedSystemMessages } = normalizeConversationMessages(payload.messages)
  if (rejectedSystemMessages > 0) {
    return createQuotaResponse(
      'Client-provided system messages are not allowed.',
      { status: 400 },
      quota
    )
  }

  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return createQuotaResponse(
      'A user message is required to start quick edit generation',
      { status: 400 },
      quota
    )
  }

  const latestMessage = conversation[conversation.length - 1]
  const latestUserMessage = latestMessage ? extractTextContent(latestMessage.content) : ''
  const securityInput = extractQuickEditInstructionForSecurity(latestUserMessage)
  const promptSecurity = evaluatePromptSecurity(securityInput)
  if (promptSecurity.blocked) {
    console.warn(`[Agent QuickEdit ${requestId}] blocked prompt`, {
      code: promptSecurity.code,
      pattern: promptSecurity.pattern,
      messageLength: securityInput.length,
    })
    return createQuotaResponse(
      'Request blocked by prompt-security policy.',
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
      system: buildQuickEditSystemPrompt(),
      messages: conversation,
      temperature: 0,
      maxTokens: 4096,
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
