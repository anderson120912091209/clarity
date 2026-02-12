import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, tool, type CoreMessage } from 'ai'
import { z } from 'zod'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import type { AgentChatContext, AgentChatSettingsContext } from '@/features/agent/types/chat-context'

export const runtime = 'edge'

interface ChatRequestBody {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model?: string
  context?: AgentChatContext
}

interface NormalizedWorkspaceFile {
  fileId: string
  path: string
  normalizedPath: string
  basename: string
  content: string
  lineCount: number
  charCount: number
}

interface NormalizedChatContext {
  activeFileId: string | null
  activeFileName: string | null
  activeFilePath: string | null
  activeFileContent: string
  workspaceFiles: NormalizedWorkspaceFile[]
  compileLogs: string
  compileError: string | null
  settings: Required<AgentChatSettingsContext>
}

const MAX_ACTIVE_FILE_CHARS = 36000
const MAX_COMPILE_LOG_CHARS = 26000
const MAX_WORKSPACE_FILES = 120
const MAX_WORKSPACE_FILE_CHARS = 20000
const MAX_WORKSPACE_TOTAL_CHARS = 180000

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .trim()
    .toLowerCase()
}

function normalizeBasename(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

function lineCountOf(text: string): number {
  if (!text) return 1
  return text.split(/\r?\n/).length
}

function trimWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n\n[Truncated]`
}

function tailWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `[Truncated]\n\n${value.slice(value.length - maxChars)}`
}

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeContext(input: AgentChatContext | undefined): NormalizedChatContext {
  const activeFilePathRaw = sanitizeText(input?.activeFilePath)
  const activeFileNameRaw = sanitizeText(input?.activeFileName)
  const activeFileContentRaw = sanitizeText(input?.activeFileContent)
  const compileLogsRaw = sanitizeText(input?.compile?.logs)
  const compileErrorRaw = sanitizeText(input?.compile?.error)

  let remainingWorkspaceBudget = MAX_WORKSPACE_TOTAL_CHARS
  const normalizedWorkspaceFiles: NormalizedWorkspaceFile[] = []
  const seenPaths = new Set<string>()

  for (const file of input?.workspaceFiles ?? []) {
    if (!file?.path || typeof file.content !== 'string') continue
    if (normalizedWorkspaceFiles.length >= MAX_WORKSPACE_FILES) break
    if (remainingWorkspaceBudget <= 0) break

    const normalizedPath = normalizePath(file.path)
    if (!normalizedPath || seenPaths.has(normalizedPath)) continue

    const trimmedContent = trimWithNotice(
      file.content,
      Math.min(MAX_WORKSPACE_FILE_CHARS, remainingWorkspaceBudget)
    )
    remainingWorkspaceBudget -= trimmedContent.length
    seenPaths.add(normalizedPath)

    normalizedWorkspaceFiles.push({
      fileId: file.fileId,
      path: file.path,
      normalizedPath,
      basename: normalizeBasename(file.path),
      content: trimmedContent,
      lineCount: lineCountOf(trimmedContent),
      charCount: trimmedContent.length,
    })
  }

  const activeFilePath = activeFilePathRaw || null
  const activeFileContent = trimWithNotice(activeFileContentRaw, MAX_ACTIVE_FILE_CHARS)

  if (activeFilePath && activeFileContent) {
    const normalizedActivePath = normalizePath(activeFilePath)
    if (!seenPaths.has(normalizedActivePath)) {
      normalizedWorkspaceFiles.unshift({
        fileId: input?.activeFileId ?? '__active__',
        path: activeFilePath,
        normalizedPath: normalizedActivePath,
        basename: normalizeBasename(activeFilePath),
        content: activeFileContent,
        lineCount: lineCountOf(activeFileContent),
        charCount: activeFileContent.length,
      })
    }
  }

  return {
    activeFileId: input?.activeFileId ?? null,
    activeFileName: activeFileNameRaw || null,
    activeFilePath,
    activeFileContent,
    workspaceFiles: normalizedWorkspaceFiles,
    compileLogs: tailWithNotice(compileLogsRaw, MAX_COMPILE_LOG_CHARS),
    compileError: compileErrorRaw || null,
    settings: {
      includeCurrentDocument: input?.settings?.includeCurrentDocument ?? true,
      webEnabled: input?.settings?.webEnabled ?? false,
      libraryEnabled: input?.settings?.libraryEnabled ?? false,
    },
  }
}

function resolveWorkspaceFile(
  workspaceFiles: NormalizedWorkspaceFile[],
  requestedPath: string
): NormalizedWorkspaceFile | null {
  const normalizedRequest = normalizePath(requestedPath)
  if (!normalizedRequest) return null

  const exactMatch = workspaceFiles.find((file) => file.normalizedPath === normalizedRequest)
  if (exactMatch) return exactMatch

  const basename = normalizeBasename(normalizedRequest)
  const basenameMatches = workspaceFiles.filter((file) => file.basename === basename)
  if (basenameMatches.length === 1) {
    return basenameMatches[0]
  }

  return null
}

function getLineMatches(content: string, query: string, maxMatches: number): Array<{ line: number; preview: string }> {
  const lines = content.split(/\r?\n/)
  const queryLower = query.toLowerCase()
  const matches: Array<{ line: number; preview: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    if (matches.length >= maxMatches) break
    const line = lines[index]
    if (!line.toLowerCase().includes(queryLower)) continue
    matches.push({
      line: index + 1,
      preview: line.trim().slice(0, 240),
    })
  }

  return matches
}

function buildWorkspaceSummary(context: NormalizedChatContext): string {
  const parts: string[] = []

  parts.push(
    [
      'Workspace Snapshot:',
      `- Active file: ${context.activeFilePath ?? context.activeFileName ?? 'none'}`,
      `- Files available in snapshot: ${context.workspaceFiles.length}`,
      `- Compile status: ${context.compileError ? `error (${context.compileError})` : 'no compile error provided'}`,
      `- Web toggle: ${context.settings.webEnabled ? 'on' : 'off'}`,
      `- Library toggle: ${context.settings.libraryEnabled ? 'on' : 'off'}`,
    ].join('\n')
  )

  const fileLines = context.workspaceFiles
    .slice(0, 80)
    .map((file) => `- ${file.path} (${file.lineCount} lines, ${file.charCount} chars)`)
  if (fileLines.length > 0) {
    parts.push(`Workspace files:\n${fileLines.join('\n')}`)
  }

  if (context.settings.includeCurrentDocument && context.activeFilePath && context.activeFileContent) {
    parts.push(
      [
        `Active file content (${context.activeFilePath}):`,
        '```',
        context.activeFileContent,
        '```',
      ].join('\n')
    )
  }

  if (context.compileLogs) {
    parts.push(
      [
        'Recent compile logs (tail):',
        '```',
        context.compileLogs,
        '```',
      ].join('\n')
    )
  }

  return parts.join('\n\n')
}

function buildSystemPrompt(context: NormalizedChatContext, extraInstructions: string[]): string {
  const base = [
    'You are an AI assistant for a LaTeX/Typst + PDF editing workspace.',
    'Be concise, technical, and directly actionable.',
    'When compile errors are involved, inspect compile logs before proposing fixes.',
    'When context is missing, use tools instead of guessing.',
    'Prefer targeted edits over full-file rewrites whenever possible.',
    'For code meant to be applied in-editor, output fenced code blocks and include metadata lines before code.',
    'Metadata format: @file: relative/path/to/file.ext and @insert: replace_file | search_replace | after_line N | before_line N | line N | after <anchor> | before <anchor> | append.',
    'For partial edits, prefer @insert: search_replace with SEARCH/REPLACE blocks.',
    'You have a MathJax render environment.',
    'Any LaTeX text between single dollar sign ($) will be rendered as a TeX formula.',
    'Use $(tex_formula)$ in-line delimiters to display equations instead of backslash delimiters.',
    'The render environment only uses $ (single dollar sign) as a container delimiter; never output $$.',
    'Example: $x^2 + 3x$ is output for "x² + 3x" to appear as TeX.',
  ].join('\n')

  const sections = [base, buildWorkspaceSummary(context)]
  if (extraInstructions.length > 0) {
    sections.push(`Additional UI instructions:\n${extraInstructions.join('\n\n')}`)
  }
  return sections.join('\n\n')
}

function buildStrictEditOutputInstruction(latestUserMessage: string): string | null {
  const lowered = latestUserMessage.toLowerCase()
  const looksLikeExplicitEditDirective =
    /@file\s*:/.test(lowered) ||
    /@insert\s*:/.test(lowered) ||
    /search_replace/.test(lowered) ||
    /search\s*:/.test(lowered) ||
    /replace\s*:/.test(lowered)

  if (!looksLikeExplicitEditDirective) return null

  return [
    'Strict edit output mode:',
    '- Output only edit blocks that can be directly applied.',
    '- Do not output explanations, bullet lists, or prose.',
    '- Prefer @file + @insert: search_replace blocks with concrete SEARCH and REPLACE content.',
    '- If SEARCH/REPLACE cannot be done safely, emit @insert: replace_file with full final file content.',
  ].join('\n')
}

function normalizeConversationMessages(
  messages: ChatRequestBody['messages']
): {
  conversation: CoreMessage[]
  uiSystemInstructions: string[]
} {
  const conversation: CoreMessage[] = []
  const uiSystemInstructions: string[] = []

  for (const message of messages) {
    const content = sanitizeText(message.content)
    if (!content) continue

    if (message.role === 'system') {
      uiSystemInstructions.push(content)
      continue
    }

    if (message.role !== 'user' && message.role !== 'assistant') continue
    conversation.push({
      role: message.role,
      content,
    })
  }

  return { conversation, uiSystemInstructions }
}

export async function POST(req: Request) {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}`

  const payload = (await req.json()) as ChatRequestBody
  const { messages } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid chat messages payload', { status: 400 })
  }

  const { conversation, uiSystemInstructions } = normalizeConversationMessages(messages)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return new Response('A user message is required to start chat generation', { status: 400 })
  }

  const context = normalizeContext(payload.context)
  const latestUserMessage = conversation[conversation.length - 1]?.content ?? ''
  const strictEditInstruction = buildStrictEditOutputInstruction(latestUserMessage)
  const systemPrompt = buildSystemPrompt(
    context,
    strictEditInstruction ? [...uiSystemInstructions, strictEditInstruction] : uiSystemInstructions
  )

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY
  if (!apiKey) {
    return new Response('Missing Google API Key', { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const selectedModel = resolveGeminiModel(payload.model)

  const runWithModel = (modelId: string) =>
    streamText({
      model: google(modelId),
      system: systemPrompt,
      messages: conversation,
      temperature: 0.1,
      maxSteps: 8,
      toolChoice: 'auto',
      tools: {
        list_workspace_files: tool({
          description: 'List files currently available in the workspace snapshot.',
          parameters: z.object({
            query: z.string().optional(),
            limit: z.number().int().min(1).max(300).optional(),
          }),
          execute: async ({ query, limit = 120 }) => {
            const queryLower = query?.trim().toLowerCase()
            const filtered = queryLower
              ? context.workspaceFiles.filter(
                  (file) =>
                    file.path.toLowerCase().includes(queryLower) ||
                    file.content.toLowerCase().includes(queryLower)
                )
              : context.workspaceFiles

            const files = filtered.slice(0, limit).map((file) => ({
              fileId: file.fileId,
              path: file.path,
              lineCount: file.lineCount,
              charCount: file.charCount,
            }))

            console.info(`[Agent Chat ${requestId}] tool=list_workspace_files`, {
              query: query ?? '',
              returned: files.length,
            })

            return {
              totalFiles: filtered.length,
              files,
            }
          },
        }),
        read_workspace_file: tool({
          description:
            'Read a file from the workspace by path. Path can be full relative path or unique basename.',
          parameters: z.object({
            path: z.string().min(1),
            startLine: z.number().int().min(1).optional(),
            endLine: z.number().int().min(1).optional(),
          }),
          execute: async ({ path, startLine, endLine }) => {
            const file = resolveWorkspaceFile(context.workspaceFiles, path)
            if (!file) {
              return {
                found: false,
                message: `File not found in workspace snapshot: ${path}`,
              }
            }

            const lines = file.content.split(/\r?\n/)
            const start = startLine ? Math.max(1, startLine) : 1
            const end = endLine ? Math.min(lines.length, endLine) : lines.length
            const selected = lines.slice(start - 1, end).join('\n')

            console.info(`[Agent Chat ${requestId}] tool=read_workspace_file`, {
              requestedPath: path,
              resolvedPath: file.path,
              start,
              end,
            })

            return {
              found: true,
              path: file.path,
              lineCount: file.lineCount,
              selectedRange: { startLine: start, endLine: end },
              content: selected,
            }
          },
        }),
        search_workspace: tool({
          description:
            'Search workspace files for a text query and return matching files with line snippets.',
          parameters: z.object({
            query: z.string().min(1),
            maxResults: z.number().int().min(1).max(80).optional(),
          }),
          execute: async ({ query, maxResults = 30 }) => {
            const queryLower = query.trim().toLowerCase()
            const results = context.workspaceFiles
              .map((file) => {
                const pathMatch = file.path.toLowerCase().includes(queryLower)
                const matches = getLineMatches(file.content, query, 4)
                const score = (pathMatch ? 5 : 0) + matches.length
                return {
                  path: file.path,
                  pathMatch,
                  matches,
                  score,
                }
              })
              .filter((result) => result.score > 0)
              .sort((left, right) => right.score - left.score)
              .slice(0, maxResults)

            console.info(`[Agent Chat ${requestId}] tool=search_workspace`, {
              query,
              results: results.length,
            })

            return {
              query,
              totalMatches: results.length,
              results,
            }
          },
        }),
        get_compile_logs: tool({
          description: 'Get the most recent compile logs and compile error state.',
          parameters: z.object({
            maxChars: z.number().int().min(500).max(MAX_COMPILE_LOG_CHARS).optional(),
          }),
          execute: async ({ maxChars = 8000 }) => {
            const logs = context.compileLogs
              ? tailWithNotice(context.compileLogs, Math.max(500, maxChars))
              : ''

            console.info(`[Agent Chat ${requestId}] tool=get_compile_logs`, {
              hasLogs: Boolean(logs),
              hasError: Boolean(context.compileError),
            })

            return {
              hasError: Boolean(context.compileError),
              error: context.compileError,
              logs: logs || 'No compile logs provided.',
            }
          },
        }),
        get_active_file_context: tool({
          description: 'Get active file path/name and optional active file content from the editor.',
          parameters: z.object({
            includeContent: z.boolean().optional(),
          }),
          execute: async ({ includeContent = true }) => {
            const payload = {
              activeFileId: context.activeFileId,
              activeFileName: context.activeFileName,
              activeFilePath: context.activeFilePath,
              activeFileContent:
                includeContent && context.activeFileContent
                  ? context.activeFileContent
                  : '[Content omitted]',
            }

            console.info(`[Agent Chat ${requestId}] tool=get_active_file_context`, {
              includeContent,
              activeFilePath: context.activeFilePath,
            })

            return payload
          },
        }),
      },
      onStepFinish: (event) => {
        console.info(`[Agent Chat ${requestId}] step finished`, {
          finishReason: event.finishReason,
          toolCalls: event.toolCalls?.map((toolCall) => toolCall.toolName) ?? [],
        })
      },
    })

  const shouldRetryWithDefaultModel = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return /not found|not supported/i.test(message)
  }

  try {
    let result
    try {
      result = await runWithModel(selectedModel)
    } catch (modelError) {
      if (selectedModel === GEMINI_DEFAULT_MODEL || !shouldRetryWithDefaultModel(modelError)) {
        throw modelError
      }

      console.warn(
        `[Agent Chat ${requestId}] Model "${selectedModel}" failed, retrying with default "${GEMINI_DEFAULT_MODEL}".`
      )
      result = await runWithModel(GEMINI_DEFAULT_MODEL)
    }

    return result.toTextStreamResponse()
  } catch (error) {
    console.error(`[Agent Chat ${requestId}] Error:`, error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
