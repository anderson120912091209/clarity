import { getPromptNonDisclosurePolicy } from '@/lib/server/prompt-security'
import type { NormalizedChatContext } from '@/lib/agent/context-normalizer'
import { SystemPromptBuilder } from '@/lib/server/system-prompts/prompt-builder'

function decodeEnvPrompt(value: string): string {
  return value.replace(/\\n/g, '\n').trim()
}

/**
 * Legacy base system prompt -- kept for backwards compatibility.
 * Prefer `buildAgentSystemPrompt()` for new code paths.
 */
export function getChatBaseSystemPrompt(): string {
  const fromEnv = process.env.AGENT_CHAT_SYSTEM_PROMPT?.trim()
  if (fromEnv) return `${decodeEnvPrompt(fromEnv)}\n\n${getPromptNonDisclosurePolicy()}`

  const fallbackBase = [
    'You are a LaTeX and Typst coding assistant.',
    'Provide concise, correct answers grounded in tool results.',
    'For code edits: inspect first, then apply minimal edits with edit tools.',
    'Never claim a file was edited unless an edit tool call succeeded.',
    'If context is missing, ask for the specific missing file/log evidence.',
  ].join('\n')

  return `${fallbackBase}\n\n${getPromptNonDisclosurePolicy()}`
}

/**
 * Build a fully-composed system prompt using the modular prompt builder.
 *
 * This assembles all relevant prompt sections based on the current
 * workspace context and user intent signals.
 */
export function buildAgentSystemPrompt(opts: {
  context: NormalizedChatContext
  typstLibraryEnabled: boolean
  forceStructuredEdits: boolean
  extraInstructions: string[]
  latestUserMessage: string
}): string {
  // If an env-override is set, respect it (same as legacy path)
  const fromEnv = process.env.AGENT_CHAT_SYSTEM_PROMPT?.trim()
  if (fromEnv) {
    return `${decodeEnvPrompt(fromEnv)}\n\n${getPromptNonDisclosurePolicy()}`
  }

  const { context, typstLibraryEnabled, extraInstructions } = opts

  const hasTypstFiles = context.workspaceFiles.some((f) =>
    f.path.toLowerCase().endsWith('.typ')
  )
  const hasLatexFiles = context.workspaceFiles.some((f) =>
    /\.(tex|sty|cls|bib|bst)$/i.test(f.path)
  )
  const hasCompileError = Boolean(context.compileError)

  const builder = new SystemPromptBuilder()

  // 1. Core identity
  builder.addBase()

  // 2. Domain expertise based on workspace content
  //    Include both if the workspace has mixed file types or neither is detected
  if (hasLatexFiles || !hasTypstFiles) {
    builder.addLatexExpertise()
  }
  if (hasTypstFiles || typstLibraryEnabled) {
    builder.addTypstExpertise()
  }

  // 3. Reasoning mode (always useful for structured thinking)
  builder.addReasoningMode()

  // 4. Edit workflow — always include so the agent knows how to use edit tools
  builder.addEditWorkflow({
    hasCompileError,
    isMultiFile: context.workspaceFiles.length > 1,
  })

  // 4b. Filesystem tools (create/delete files and folders)
  builder.addFilesystemTools()

  // 5. Workspace snapshot
  builder.addWorkspaceContext(context)

  // 6. Compile debug mode
  if (hasCompileError && context.compileError) {
    builder.addCompileDebugMode(context.compileError)
  }

  // 7. Typst skill-doc lookup mode
  if (typstLibraryEnabled) {
    builder.addTypstLibraryMode()
  }

  // 8. Extra UI instructions
  if (extraInstructions.length > 0) {
    builder.addExtraInstructions(extraInstructions)
  }

  // 9. Security policy (always last so the model sees it right before generating)
  builder.addSecurityPolicy()

  return builder.build()
}
