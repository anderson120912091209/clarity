import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import { authorizeAgentRequest } from '@/lib/server/agent-auth'
import { evaluatePromptSecurity } from '@/lib/server/prompt-security'
import { buildQuickEditSystemPrompt } from '@/lib/server/quick-edit-system-prompt'
import { resolveUserContext } from '@/lib/server/resolve-user-plan'
import { checkTokenBudget, recordTokenUsage, type TokenQuotaSnapshot } from '@/lib/server/token-quota'

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

function attachQuotaHeaders(headers: Headers, quota: TokenQuotaSnapshot) {
  headers.set('X-AI-Quota-Limit', String(quota.limit))
  headers.set('X-AI-Quota-Used', String(quota.used))
  headers.set('X-AI-Quota-Remaining', String(quota.remaining))
  headers.set('X-AI-Quota-Period', quota.period)
  headers.set('X-AI-Quota-Store', quota.store)
}

function createQuotaResponse(
  body: BodyInit | null,
  init: ResponseInit,
  quota: TokenQuotaSnapshot
): Response {
  const headers = new Headers(init.headers)
  attachQuotaHeaders(headers, quota)
  return new Response(body, { ...init, headers })
}

export async function GET(req: Request) {
  const userCtx = await resolveUserContext(req)
  const quota = await checkTokenBudget(userCtx.userId, userCtx.entitlements.aiTokenLimit)

  return Response.json({
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    allowed: quota.allowed,
    store: quota.store,
    period: quota.period,
    plan: userCtx.plan,
  })
}

export async function POST(req: Request) {
  const authError = authorizeAgentRequest(req)
  if (authError) {
    console.warn('[Agent QuickEdit] auth rejected')
    return authError
  }

  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `qe-${Date.now()}`

  console.info(`[Agent QuickEdit ${requestId}] incoming request`)

  const userCtx = await resolveUserContext(req)
  console.info(`[Agent QuickEdit ${requestId}] user=${userCtx.userId} plan=${userCtx.plan} source=${userCtx.planSource}`)
  const quota = await checkTokenBudget(userCtx.userId, userCtx.entitlements.aiTokenLimit)

  if (!quota.allowed) {
    return createQuotaResponse(
      JSON.stringify({
        error: 'AI token quota exceeded for this billing period.',
        used: quota.used,
        limit: quota.limit,
        period: quota.period,
        plan: userCtx.plan,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
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

    // Record token usage asynchronously after stream completes
    void result.usage.then((usage) => {
      const totalTokens = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0)
      if (totalTokens > 0) {
        void recordTokenUsage(
          userCtx.userId,
          userCtx.entitlements.aiTokenLimit,
          totalTokens
        ).then((updated) => {
          console.info(`[Agent QuickEdit ${requestId}] token usage recorded`, {
            prompt: usage.promptTokens,
            completion: usage.completionTokens,
            total: totalTokens,
            periodUsed: updated.used,
            periodLimit: updated.limit,
          })
        }).catch((err) => {
          console.error(`[Agent QuickEdit ${requestId}] failed to record token usage`, err)
        })
      }
    }).catch((err) => {
      console.error(`[Agent QuickEdit ${requestId}] failed to read usage`, err)
    })

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
