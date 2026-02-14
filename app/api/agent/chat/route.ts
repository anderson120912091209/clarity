import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, tool, type CoreMessage } from 'ai'
import { z } from 'zod'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
import type { AgentChatContext, AgentChatSettingsContext } from '@/features/agent/types/chat-context'
import {
  listTypstSkillDocs,
  readTypstSkillDoc,
  searchTypstSkillDocs,
} from '@/lib/agent/typst-skill-library'

export const runtime = 'nodejs'

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

function supportsTypstLibrary(context: NormalizedChatContext, latestUserMessage: string): boolean {
  const activePath = context.activeFilePath?.toLowerCase() ?? ''
  const hasTypstActiveFile = activePath.endsWith('.typ')
  const hasTypstWorkspaceFile = context.workspaceFiles.some((file) =>
    file.path.toLowerCase().endsWith('.typ')
  )
  const mentionsTypst = /\btypst\b|\btouying\b|\.typ\b/i.test(latestUserMessage)

  return hasTypstActiveFile || hasTypstWorkspaceFile || mentionsTypst
}

function shouldEnableTypstLibrary(context: NormalizedChatContext, latestUserMessage: string): boolean {
  return context.settings.libraryEnabled || supportsTypstLibrary(context, latestUserMessage)
}

function isLikelyEditIntent(latestUserMessage: string): boolean {
  const text = latestUserMessage.toLowerCase()
  if (!text.trim()) return false

  if (/@file\s*:|@insert\s*:|search\s*:|replace\s*:/i.test(latestUserMessage)) {
    return true
  }

  const editSignals = [
    /\bedit\b/,
    /\bfix\b/,
    /\bupdate\b/,
    /\brewrite\b/,
    /\brefactor\b/,
    /\bconvert\b/,
    /\bchange\b/,
    /\badjust\b/,
    /\bmodify\b/,
    /\bapply\b/,
    /\bremove\b/,
    /\badd\b/,
    /\bformat\b/,
  ]

  return editSignals.some((pattern) => pattern.test(text))
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

function buildSystemPrompt(
  context: NormalizedChatContext,
  extraInstructions: string[],
  options: { typstLibraryEnabled: boolean; forceStructuredEdits: boolean }
): string {
  const base = [
    'You are LaTeX Architect, an expert coding assistant dedicated to helping users create, debug, and optimize LaTeX and Typst documents.',
    '',
    '## Core Responsibilities',
    '',
    '### Syntax Identification',
    '- Analyze before responding: identify LaTeX (\\documentclass, \\usepackage, \\begin) vs Typst (#, set, show, let).',
    '- If ambiguous, ask for clarification or default to LaTeX.',
    '',
    '### Code Generation',
    '- Create complete documents based on user descriptions.',
    '- Generate specific snippets for complex elements (tables, figures, equations).',
    '- Always use modern packages/functions and best practices.',
    '',
    '### Debugging & Optimization',
    '- Analyze user code to find errors, deprecated packages, or formatting issues.',
    '- Provide corrected code alongside a clear explanation.',
    '- When a compile error is reported, ALWAYS call get_compile_logs first before suggesting fixes.',
    '',
    '## File Editing (CRITICAL)',
    '',
    'When the user asks you to edit, fix, or create code in their files:',
    '- **ALWAYS use the `apply_file_edit` tool** to propose file changes.',
    '- **NEVER output raw @file: or @insert: metadata in your text response.**',
    '- **NEVER output raw SEARCH:/REPLACE: blocks in your text response.**',
    '- For partial edits, use editType: "search_replace" with the exact text to find and replace.',
    '- For full file rewrites, use editType: "replace_file" with the complete new content.',
    '- You may call apply_file_edit multiple times for multiple files or multiple edits.',
    '- After calling the tool, provide a brief explanation of what you changed in your text response.',
    '',
    '## Guidelines',
    '',
    '- Structure: Full documents need preamble + \\begin{document}...\\end{document}.',
    '- Math: Use amsmath. Prefer \\begin{align}/\\begin{equation} over $$.',
    '- Tables: Use booktabs. Avoid vertical lines (|).',
    '- Be concise: code first, then explanation.',
    '',
    '## MathJax Rendering',
    '- You have a MathJax render environment for chat display.',
    '- Use $(tex_formula)$ inline delimiters (single dollar sign only).',
    '- Never output $$ (double dollar sign) in your chat text.',
    '- Example: $x^2 + 3x$ renders as "x² + 3x".',
  ].join('\n')

  const sections = [base, buildWorkspaceSummary(context)]
  if (options.typstLibraryEnabled) {
    sections.push(
      [
        'Typst skill mode:',
        '- Use `search_typst_skill_docs` before proposing Typst or Touying syntax.',
        '- Use `read_typst_skill_doc` to confirm exact function names and parameters.',
        '- If docs conflict with memory, trust the retrieved docs.',
      ].join('\n')
    )
  }

  if (options.forceStructuredEdits) {
    sections.push(
      [
        'Structured edit mode (enforced):',
        '- The user asked for file edits.',
        '- You must call `apply_file_edit` for every edit you intend to make.',
        '- Do not claim edits were applied unless you actually emitted apply_file_edit tool calls.',
        '- Do not respond with plain narrative-only plans for edit requests.',
      ].join('\n')
    )
  }

  if (extraInstructions.length > 0) {
    sections.push(`Additional UI instructions:\n${extraInstructions.join('\n\n')}`)
  }
  return sections.join('\n\n')
}

// buildStrictEditOutputInstruction removed — edits are now handled via the apply_file_edit tool

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
  const isAiChatEnabled =
    process.env.ENABLE_AI_CHAT === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true'
  if (!isAiChatEnabled) {
    return new Response('AI chat is disabled.', { status: 403 })
  }

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
  const typstLibraryEnabled = shouldEnableTypstLibrary(context, latestUserMessage)
  const forceStructuredEdits = isLikelyEditIntent(latestUserMessage)

  // Auto-inject compile error awareness
  if (context.compileError) {
    uiSystemInstructions.push(
      '⚠️ There is an active compile error. Call get_compile_logs to investigate before suggesting fixes.'
    )
  }

  const systemPrompt = buildSystemPrompt(
    context,
    uiSystemInstructions,
    { typstLibraryEnabled, forceStructuredEdits }
  )

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

  const runWithModel = (modelId: string) =>
    streamText({
      model: google(modelId),
      system: systemPrompt,
      messages: conversation,
      temperature: 0.1,
      maxSteps: forceStructuredEdits ? 12 : 8,
      toolChoice: forceStructuredEdits ? 'required' : 'auto',
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
        list_typst_skill_docs: tool({
          description:
            'List indexed Typst/Touying local skill documents available for grounded syntax lookups.',
          parameters: z.object({
            limit: z.number().int().min(1).max(200).optional(),
          }),
          execute: async ({ limit = 120 }) => {
            if (!typstLibraryEnabled) {
              return {
                enabled: false,
                message:
                  'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
              }
            }

            const docs = await listTypstSkillDocs(limit)

            console.info(`[Agent Chat ${requestId}] tool=list_typst_skill_docs`, {
              limit,
              returned: docs.docs.length,
            })

            return {
              enabled: true,
              ...docs,
            }
          },
        }),
        search_typst_skill_docs: tool({
          description:
            'Search Typst/Touying local skill docs by query and return top matching snippets with paths.',
          parameters: z.object({
            query: z.string().min(1),
            limit: z.number().int().min(1).max(20).optional(),
          }),
          execute: async ({ query, limit = 8 }) => {
            if (!typstLibraryEnabled) {
              return {
                enabled: false,
                message:
                  'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
              }
            }

            const results = await searchTypstSkillDocs(query, limit)

            console.info(`[Agent Chat ${requestId}] tool=search_typst_skill_docs`, {
              query,
              totalMatches: results.totalMatches,
              returned: results.results.length,
            })

            return {
              enabled: true,
              ...results,
            }
          },
        }),
        read_typst_skill_doc: tool({
          description:
            'Read a specific Typst/Touying skill document by relative path and optional line range.',
          parameters: z.object({
            path: z.string().min(1),
            startLine: z.number().int().min(1).optional(),
            endLine: z.number().int().min(1).optional(),
          }),
          execute: async ({ path, startLine, endLine }) => {
            if (!typstLibraryEnabled) {
              return {
                enabled: false,
                message:
                  'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
              }
            }

            const result = await readTypstSkillDoc(path, startLine, endLine)

            console.info(`[Agent Chat ${requestId}] tool=read_typst_skill_doc`, {
              requestedPath: path,
              found: result.found,
              startLine,
              endLine,
            })

            return {
              enabled: true,
              ...result,
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
        apply_file_edit: tool({
        description:
          'Apply a code edit to a file in the workspace. Use this tool whenever the user asks you to edit, fix, create, or modify code. For partial edits, use editType "search_replace". For full file rewrites, use editType "replace_file".',
        parameters: z.object({
          filePath: z
            .string()
            .min(1)
            .describe('Relative path of the file to edit (e.g. "main.tex", "src/chapter1.typ").'),
          editType: z
            .enum(['search_replace', 'replace_file'])
            .describe(
              'Edit strategy: "search_replace" replaces a specific section, "replace_file" replaces the entire file content.'
            ),
          searchContent: z
            .string()
            .optional()
            .describe(
              'For search_replace: the exact text to find in the file. Must match the existing file content precisely.'
            ),
          replaceContent: z
            .string()
            .describe(
              'The replacement content. For search_replace: replaces the searchContent. For replace_file: the complete new file content.'
            ),
          description: z
            .string()
            .optional()
            .describe('Brief human-readable description of what this edit does.'),
        }),
        execute: async ({ filePath, editType, searchContent, replaceContent, description }) => {
          console.info(`[Agent Chat ${requestId}] tool=apply_file_edit`, {
            filePath,
            editType,
            description,
            searchContentLength: searchContent?.length ?? 0,
            replaceContentLength: replaceContent.length,
          })

          // Validate search_replace has searchContent
          if (editType === 'search_replace' && !searchContent) {
            return {
              applied: false,
              error: 'searchContent is required for search_replace edit type.',
            }
          }

          // The actual file edit is applied on the frontend via changeManager.
          // We return the edit instruction so the frontend can stage it.
          return {
            applied: true,
            filePath,
            editType,
            searchContent: searchContent ?? null,
            replaceContent,
            description: description ?? `Edit ${filePath}`,
          }
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

    return result.toDataStreamResponse()
  } catch (error) {
    console.error(`[Agent Chat ${requestId}] Error:`, error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
