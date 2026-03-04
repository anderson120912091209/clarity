import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import { createProviderFromRequest } from '@/lib/server/ai-provider-factory'
import type { AgentChatContext } from '@/features/agent/types/chat-context'
import {
  normalizeContext,
  normalizePath,
  sanitizeText,
  shouldEnableTypstLibrary,
  isLikelyEditIntent,
} from '@/lib/agent/context-normalizer'
import { createAgentTools, createReadOnlyTools } from '@/lib/agent/tools'
import type { ToolContext, ToolMutableState } from '@/lib/agent/tools'
import { CheckpointManager } from '@/lib/agent/checkpoint-manager'
import { buildAgentSystemPrompt } from '@/lib/server/chat-system-prompt'
import { buildAgentPlanningPrompt } from '@/lib/server/system-prompts/planning-mode'
import { shouldRetry, getRetryDelay, sleep, DEFAULT_RETRY_POLICY } from '@/lib/agent/retry-policy'
import { getPostHogClient } from '@/lib/posthog-server'
import { authorizeAgentRequest } from '@/lib/server/agent-auth'
import { evaluatePromptSecurity } from '@/lib/server/prompt-security'
import { resolveUserContext } from '@/lib/server/resolve-user-plan'
import { checkTokenBudget, recordTokenUsage } from '@/lib/server/token-quota'

export const runtime = 'nodejs'

interface ChatRequestBody {
  messages: Array<{ role: string; content: string }>
  model?: string
  context?: AgentChatContext
  planningMode?: boolean
  // BYOK: user-provided API key (transient, never stored)
  provider?: string
  apiKey?: string
}

function normalizeConversationMessages(
  messages: ChatRequestBody['messages']
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

    if (message.role !== 'user' && message.role !== 'assistant') continue
    conversation.push({ role: message.role, content })
  }

  return { conversation, rejectedSystemMessages }
}

function extractTextContent(content: CoreMessage['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
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
  return ''
}

export async function POST(req: Request) {
  // ── Auth & Quota ──
  const authError = authorizeAgentRequest(req)
  if (authError) return authError

  const userCtx = await resolveUserContext(req)

  // BYOK users skip server-managed quota (they pay their own API costs)
  const payload = (await req.json()) as ChatRequestBody
  const isByok = Boolean(payload.apiKey && payload.provider)

  if (!isByok) {
    const tokenBudget = await checkTokenBudget(userCtx.userId, userCtx.entitlements.aiTokenLimit)
    if (!tokenBudget.allowed) {
      return new Response(
        JSON.stringify({
          error: 'AI token quota exceeded for this billing period.',
          used: tokenBudget.used,
          limit: tokenBudget.limit,
          period: tokenBudget.period,
          plan: userCtx.plan,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const isAiChatEnabled =
      process.env.ENABLE_AI_CHAT === 'true' ||
      process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true'
    if (!isAiChatEnabled) {
      return new Response('AI chat is disabled.', { status: 403 })
    }
  }

  // ── Parse & Validate ──
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}`

  const { messages } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid chat messages payload', { status: 400 })
  }

  const { conversation, rejectedSystemMessages } = normalizeConversationMessages(messages)
  if (rejectedSystemMessages > 0) {
    return new Response('Client-provided system messages are not allowed', { status: 400 })
  }
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return new Response('A user message is required to start chat generation', { status: 400 })
  }

  // ── Context & Security ──
  const context = normalizeContext(payload.context)
  const lastMsg = conversation[conversation.length - 1]
  const latestUserMessage = lastMsg ? extractTextContent(lastMsg.content) : ''

  const promptSecurity = evaluatePromptSecurity(latestUserMessage)
  if (promptSecurity.blocked) {
    console.warn(`[Agent Chat ${requestId}] blocked prompt`, {
      code: promptSecurity.code,
      pattern: promptSecurity.pattern,
      messageLength: latestUserMessage.length,
    })
    return new Response('Request blocked by prompt-security policy.', { status: 400 })
  }

  // ── Feature Flags ──
  const typstLibraryEnabled = shouldEnableTypstLibrary(context, latestUserMessage)
  const forceStructuredEdits = isLikelyEditIntent(latestUserMessage)
  const planningMode = payload.planningMode === true

  const extraInstructions: string[] = []
  if (context.compileError) {
    extraInstructions.push(
      'There is an active compile error. Call get_compile_logs to investigate before suggesting fixes.'
    )
  }

  // ── System Prompt ──
  const systemPrompt = planningMode
    ? buildAgentPlanningPrompt({
        context,
        typstLibraryEnabled,
        latestUserMessage,
      })
    : buildAgentSystemPrompt({
        context,
        typstLibraryEnabled,
        forceStructuredEdits,
        extraInstructions,
        latestUserMessage,
      })

  // ── API Key & Model ──
  let resolvedModel: string
  let modelInstance: ReturnType<typeof createGoogleGenerativeAI> | null = null

  if (isByok) {
    // BYOK: use user-provided key (transient, never stored/logged)
    try {
      const providerResult = createProviderFromRequest({
        provider: payload.provider,
        apiKey: payload.apiKey,
        model: payload.model,
      })
      resolvedModel = providerResult.resolvedModelId
      // modelInstance is unused in BYOK path — we use providerResult.model directly below
      ;(modelInstance as unknown) = providerResult
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid provider configuration'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } else {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY
    if (!apiKey) {
      return new Response('Missing Google API Key', { status: 401 })
    }
    modelInstance = createGoogleGenerativeAI({ apiKey }) as ReturnType<typeof createGoogleGenerativeAI>
    resolvedModel = resolveGeminiModel(payload.model)
  }

  const selectedModel = resolvedModel

  console.info(`[Agent Chat ${requestId}] request`, {
    model: selectedModel,
    provider: isByok ? payload.provider : 'google',
    byok: isByok,
    workspaceFiles: context.workspaceFiles.length,
    typstLibraryEnabled,
    forceStructuredEdits,
    planningMode,
  })

  // ── Analytics (NEVER include apiKey) ──
  const posthog = getPostHogClient()
  posthog?.capture({
    distinctId: userCtx.userId !== 'anonymous' ? userCtx.userId : (context.userId ?? requestId),
    event: 'ai_chat_message_sent',
    properties: {
      user_id: userCtx.userId,
      plan: userCtx.plan,
      model: selectedModel,
      provider: isByok ? payload.provider : 'google',
      byok: isByok,
      workspace_files_count: context.workspaceFiles.length,
      typst_library_enabled: typstLibraryEnabled,
      force_structured_edits: forceStructuredEdits,
      planning_mode: planningMode,
      has_compile_error: Boolean(context.compileError),
      message_length: latestUserMessage.length,
    },
  })

  // ── Stream Generation ──
  const byokProviderResult = isByok ? (modelInstance as unknown as { model: import('ai').LanguageModel }) : null

  const runWithModel = (modelId: string) => {
    const checkpointManager = new CheckpointManager()
    const virtualWorkspaceContent = new Map<string, string>()
    for (const file of context.workspaceFiles) {
      virtualWorkspaceContent.set(file.normalizedPath, file.content)
    }

    const toolCtx: ToolContext = {
      requestId,
      context,
      typstLibraryEnabled,
      normalizedActivePath: context.activeFilePath ? normalizePath(context.activeFilePath) : null,
      virtualWorkspaceContent,
      checkpointManager,
      stepIndex: 0,
    }

    const toolState: ToolMutableState = {
      hasWorkspaceSurvey: false,
      applyFileEditAttempts: 0,
      batchEditAttempts: 0,
      filesReadInRun: new Set(),
      filesCreatedInRun: new Set(),
      filesDeletedInRun: new Set(),
    }

    // Use BYOK provider model directly, or server-managed Google provider
    const streamModel = byokProviderResult
      ? byokProviderResult.model
      : (modelInstance as ReturnType<typeof createGoogleGenerativeAI>)(modelId)

    return streamText({
      model: streamModel,
      system: systemPrompt,
      messages: conversation,
      temperature: 0.05,
      maxSteps: planningMode ? 10 : 30,
      toolChoice: 'auto',
      tools: planningMode
        ? createReadOnlyTools(toolCtx, toolState)
        : createAgentTools(toolCtx, toolState),
      onStepFinish: (event) => {
        toolCtx.stepIndex += 1
        console.info(`[Agent Chat ${requestId}] step finished`, {
          finishReason: event.finishReason,
          toolCalls: event.toolCalls?.map((tc) => tc.toolName) ?? [],
          step: toolCtx.stepIndex,
          editsApplied: toolState.applyFileEditAttempts,
        })
      },
    })
  }

  // ── Execute with Retry ──
  try {
    let result
    let attempt = 0

    while (true) {
      try {
        const modelId = attempt === 0 ? selectedModel : GEMINI_DEFAULT_MODEL
        result = await runWithModel(modelId)
        break
      } catch (error) {
        attempt += 1

        // Model not found: fallback to default (once)
        if (attempt === 1 && selectedModel !== GEMINI_DEFAULT_MODEL) {
          const message = error instanceof Error ? error.message : String(error)
          if (/not found|not supported/i.test(message)) {
            console.warn(
              `[Agent Chat ${requestId}] Model "${selectedModel}" failed, retrying with default "${GEMINI_DEFAULT_MODEL}".`
            )
            continue
          }
        }

        // Transient errors: retry with backoff
        if (shouldRetry(error, attempt, DEFAULT_RETRY_POLICY)) {
          const delay = getRetryDelay(attempt, DEFAULT_RETRY_POLICY)
          console.warn(`[Agent Chat ${requestId}] Retrying in ${delay}ms (attempt ${attempt})`)
          await sleep(delay)
          continue
        }

        throw error
      }
    }

    // Record token usage asynchronously (skip for BYOK — users pay their own API costs)
    if (!isByok) {
      void result.usage.then((usage) => {
        const totalTokens = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0)
        if (totalTokens > 0) {
          void recordTokenUsage(
            userCtx.userId,
            userCtx.entitlements.aiTokenLimit,
            totalTokens
          ).then((updated) => {
            console.info(`[Agent Chat ${requestId}] token usage recorded`, {
              prompt: usage.promptTokens,
              completion: usage.completionTokens,
              total: totalTokens,
              periodUsed: updated.used,
              periodLimit: updated.limit,
            })
          }).catch((err) => {
            console.error(`[Agent Chat ${requestId}] failed to record token usage`, err)
          })
        }
      }).catch((err) => {
        console.error(`[Agent Chat ${requestId}] failed to read usage`, err)
      })
    }

    return result.toDataStreamResponse()
  } catch (error) {
    console.error(`[Agent Chat ${requestId}] Error:`, error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
