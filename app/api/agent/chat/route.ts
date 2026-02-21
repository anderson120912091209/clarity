import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import type { AgentChatContext } from '@/features/agent/types/chat-context'
import {
  normalizeContext,
  normalizePath,
  sanitizeText,
  shouldEnableTypstLibrary,
  isLikelyEditIntent,
} from '@/lib/agent/context-normalizer'
import { createAgentTools } from '@/lib/agent/tools'
import type { ToolContext, ToolMutableState } from '@/lib/agent/tools'
import { CheckpointManager } from '@/lib/agent/checkpoint-manager'
import { buildAgentSystemPrompt } from '@/lib/server/chat-system-prompt'
import { shouldRetry, getRetryDelay, sleep, DEFAULT_RETRY_POLICY } from '@/lib/agent/retry-policy'
import { getPostHogClient } from '@/lib/posthog-server'
import { authorizeAgentRequest } from '@/lib/server/agent-auth'
import { buildChatQuotaKey, CHAT_CLIENT_QUOTA } from '@/lib/server/chat-quota'
import { evaluatePromptSecurity } from '@/lib/server/prompt-security'
import { checkFixedQuota } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

interface ChatRequestBody {
  messages: Array<{ role: string; content: string }>
  model?: string
  context?: AgentChatContext
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

  const quota = await checkFixedQuota({
    key: buildChatQuotaKey(req),
    limit: CHAT_CLIENT_QUOTA,
  })
  if (!quota.allowed) {
    return new Response(
      `AI chat quota reached for this client (${CHAT_CLIENT_QUOTA} total requests).`,
      { status: 429 }
    )
  }

  const isAiChatEnabled =
    process.env.ENABLE_AI_CHAT === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true'
  if (!isAiChatEnabled) {
    return new Response('AI chat is disabled.', { status: 403 })
  }

  // ── Parse & Validate ──
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}`

  const payload = (await req.json()) as ChatRequestBody
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

  const extraInstructions: string[] = []
  if (context.compileError) {
    extraInstructions.push(
      'There is an active compile error. Call get_compile_logs to investigate before suggesting fixes.'
    )
  }

  // ── System Prompt ──
  const systemPrompt = buildAgentSystemPrompt({
    context,
    typstLibraryEnabled,
    forceStructuredEdits,
    extraInstructions,
    latestUserMessage,
  })

  // ── API Key & Model ──
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY
  if (!apiKey) {
    return new Response('Missing Google API Key', { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const selectedModel = resolveGeminiModel(payload.model)

  console.info(`[Agent Chat ${requestId}] request`, {
    model: selectedModel,
    workspaceFiles: context.workspaceFiles.length,
    typstLibraryEnabled,
    forceStructuredEdits,
  })

  // ── Analytics ──
  const posthog = getPostHogClient()
  posthog?.capture({
    distinctId: context.userId ?? requestId,
    event: 'ai_chat_message_sent',
    properties: {
      user_id: context.userId,
      model: selectedModel,
      workspace_files_count: context.workspaceFiles.length,
      typst_library_enabled: typstLibraryEnabled,
      force_structured_edits: forceStructuredEdits,
      has_compile_error: Boolean(context.compileError),
      message_length: latestUserMessage.length,
    },
  })

  // ── Stream Generation ──
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
      filesReadInRun: new Set(),
    }

    return streamText({
      model: google(modelId),
      system: systemPrompt,
      messages: conversation,
      temperature: 0.05,
      maxSteps: forceStructuredEdits ? 30 : 16,
      toolChoice: 'auto',
      tools: createAgentTools(toolCtx, toolState),
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

    return result.toDataStreamResponse()
  } catch (error) {
    console.error(`[Agent Chat ${requestId}] Error:`, error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
