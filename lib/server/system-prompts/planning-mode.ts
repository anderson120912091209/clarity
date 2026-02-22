/**
 * Planning Mode System Prompt Module
 *
 * Generates a system prompt that instructs the agent to analyze
 * the request and produce a structured plan, without executing edits.
 */

import type { NormalizedChatContext } from '@/lib/agent/context-normalizer'
import { SystemPromptBuilder } from './prompt-builder'

export function getAgentPlanningPrompt(): string {
  return [
    'Planning Mode (active):',
    '- You are in PLANNING MODE. Your job is to produce a clear, actionable plan.',
    '- You do NOT have edit, create, or delete tools available. Do not attempt to call them.',
    '- You CAN read files, list workspace files, search, and check compile logs.',
    '',
    'Instructions:',
    '1. Read the relevant files using your tools to understand the current state.',
    '2. Analyze what needs to change to fulfill the user\'s request.',
    '3. Output a structured plan following the format below.',
    '',
    'Plan format:',
    '',
    '## Plan',
    '',
    'Brief summary of what needs to change and why (1-2 sentences).',
    '',
    '### Steps',
    '',
    '1. **[file path]**: Description of what will change in this file.',
    '2. **[file path]**: Description of what will change in this file.',
    '... (as many steps as needed)',
    '',
    '### Notes',
    '',
    '- Any potential issues, dependencies, or considerations.',
    '',
    'Rules:',
    '- Read the relevant files FIRST using your tools before writing the plan.',
    '- Be specific about WHAT will change (e.g., "Add \\\\usepackage{tikz} to preamble on line 5", not "fix the diagram").',
    '- Reference exact locations or code snippets when possible.',
    '- Keep the plan concise but complete — the user needs enough detail to evaluate it.',
    '- Do NOT output full code blocks with the actual edits. Save that for execution.',
    '- Do NOT fabricate file contents — read them with tools first.',
    '- If you cannot determine the right approach, explain what information is missing.',
  ].join('\n')
}

export function buildAgentPlanningPrompt(opts: {
  context: NormalizedChatContext
  typstLibraryEnabled: boolean
  latestUserMessage: string
}): string {
  const { context, typstLibraryEnabled } = opts

  const hasTypstFiles = context.workspaceFiles.some((f) =>
    f.path.toLowerCase().endsWith('.typ')
  )
  const hasLatexFiles = context.workspaceFiles.some((f) =>
    /\.(tex|sty|cls|bib|bst)$/i.test(f.path)
  )

  const builder = new SystemPromptBuilder()

  // 1. Core identity + tool execution policy
  builder.addBase()

  // 2. Domain expertise
  if (hasLatexFiles || !hasTypstFiles) {
    builder.addLatexExpertise()
  }
  if (hasTypstFiles || typstLibraryEnabled) {
    builder.addTypstExpertise()
  }

  // 3. Planning instructions (replaces edit workflow + filesystem tools)
  builder.addExtraInstructions([getAgentPlanningPrompt()])

  // 4. Workspace snapshot
  builder.addWorkspaceContext(context)

  // 5. Compile debug context
  if (context.compileError) {
    builder.addCompileDebugMode(context.compileError)
  }

  // 6. Typst library mode
  if (typstLibraryEnabled) {
    builder.addTypstLibraryMode()
  }

  // 7. Security policy
  builder.addSecurityPolicy()

  return builder.build()
}
