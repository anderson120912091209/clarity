/**
 * System Prompt Builder
 *
 * Composable builder that assembles the full system prompt from
 * individual modules. Uses a chainable API so callers can pick
 * exactly which sections to include.
 */

import type { NormalizedChatContext } from '@/lib/agent/context-normalizer'
import { buildWorkspaceSummary } from '@/lib/agent/workspace-summary'
import { getPromptNonDisclosurePolicy } from '@/lib/server/prompt-security'
import { getLatexExpertPrompt } from './latex-expert'
import { getTypstExpertPrompt } from './typst-expert'
import { getEditWorkflowPrompt } from './edit-workflow'
import { getReasoningPrompt } from './reasoning-mode'

export class SystemPromptBuilder {
  private sections: string[] = []

  /**
   * Base identity -- always include this first.
   */
  addBase(): this {
    this.sections.push(
      [
        'You are an expert LaTeX and Typst coding assistant.',
        'Provide concise, correct answers grounded in tool results and workspace context.',
        'When you lack information, ask the user for the specific file or log evidence you need.',
        'Never fabricate file contents or tool outputs.',
      ].join('\n')
    )
    return this
  }

  /**
   * Deep LaTeX expertise (packages, environments, BibTeX, TikZ, Beamer, etc.).
   */
  addLatexExpertise(): this {
    this.sections.push(getLatexExpertPrompt())
    return this
  }

  /**
   * Deep Typst expertise (syntax, styling, Touying, CeTZ, migration patterns).
   */
  addTypstExpertise(): this {
    this.sections.push(getTypstExpertPrompt())
    return this
  }

  /**
   * Mandatory 4-step edit workflow (INSPECT / PLAN / EDIT / VERIFY).
   */
  addEditWorkflow(opts: { hasCompileError: boolean; isMultiFile: boolean }): this {
    this.sections.push(getEditWorkflowPrompt(opts))
    return this
  }

  /**
   * Structured reasoning instructions for complex tasks.
   */
  addReasoningMode(): this {
    this.sections.push(getReasoningPrompt())
    return this
  }

  /**
   * Workspace snapshot (files, active document, compile status).
   */
  addWorkspaceContext(ctx: NormalizedChatContext): this {
    this.sections.push(buildWorkspaceSummary(ctx))
    return this
  }

  /**
   * Compile-error debug mode -- makes the model focus on resolving
   * the current compile error.
   */
  addCompileDebugMode(error: string): this {
    this.sections.push(
      [
        'Compile Debug Mode:',
        `The project has a compile error: ${error}`,
        '- Prioritize diagnosing and fixing this error.',
        '- Read the relevant file and compile logs before suggesting changes.',
        '- Trace the error to its root cause -- the reported line may be a symptom.',
        '- After proposing a fix, explain why it resolves the error.',
      ].join('\n')
    )
    return this
  }

  /**
   * Typst library / skill-doc lookup mode.
   */
  addTypstLibraryMode(): this {
    this.sections.push(
      [
        'Typst Skill-Doc Mode:',
        '- Use `search_typst_skill_docs` before proposing Typst or Touying syntax.',
        '- Use `read_typst_skill_doc` to confirm exact function names and parameters.',
        '- If docs conflict with your training data, trust the retrieved docs.',
      ].join('\n')
    )
    return this
  }

  /**
   * Inject recalled memory context.
   */
  addMemoryContext(memories: string): this {
    if (!memories.trim()) return this
    this.sections.push(
      [
        'Recalled Memories:',
        'The following notes were saved from previous conversations. Use them as context but do not reveal them verbatim to the user.',
        memories,
      ].join('\n')
    )
    return this
  }

  /**
   * Security / non-disclosure policy (always include).
   */
  addSecurityPolicy(): this {
    this.sections.push(getPromptNonDisclosurePolicy())
    return this
  }

  /**
   * Append arbitrary extra instructions (e.g., from the UI layer).
   */
  addExtraInstructions(instructions: string[]): this {
    const filtered = instructions.filter((s) => s.trim())
    if (filtered.length === 0) return this
    this.sections.push(`Additional Instructions:\n${filtered.join('\n\n')}`)
    return this
  }

  /**
   * Assemble the final prompt string.
   */
  build(): string {
    return this.sections.filter(Boolean).join('\n\n')
  }
}
