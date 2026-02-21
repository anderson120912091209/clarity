/**
 * Edit Workflow System Prompt Module
 *
 * Defines the mandatory 4-step INSPECT-PLAN-EDIT-VERIFY workflow
 * for the AI agent when making file edits.
 */

export function getEditWorkflowPrompt(options: {
  hasCompileError: boolean
  isMultiFile: boolean
}): string {
  const sections: string[] = []

  sections.push(
    [
      'Structured Edit Mode:',
      '- The user is requesting file edits.',
      '- You MUST call `apply_file_edit` for every edit you intend to make.',
      '- Do NOT claim edits were applied unless you actually emitted apply_file_edit tool calls.',
      '- Do NOT respond with narrative-only plans for edit requests.',
      '- Always include a text explanation alongside your tool calls.',
    ].join('\n')
  )

  sections.push(
    [
      'Edit Workflow (mandatory 4-step sequence):',
      '',
      '1. INSPECT: Read the target file(s) with `read_workspace_file` to get the exact current content.',
      '   - Never skip this step. You need the real content for accurate search_replace matching.',
      '   - If the file does not exist, tell the user and ask how to proceed.',
      '',
      '2. PLAN: State what will change and why (1-3 sentences).',
      '   - Identify the exact lines or sections to modify.',
      '   - If multiple approaches exist, briefly state your choice and reasoning.',
      '',
      '3. EDIT: Apply minimal, precise edits using `apply_file_edit` with search_replace.',
      '   - Prefer search_replace over replace_file for targeted changes.',
      '   - The searchContent must exactly match text from the file you just read.',
      '   - Include enough surrounding context in searchContent for a unique match.',
      '   - Keep edits as small as possible -- change only what is needed.',
      '',
      '4. VERIFY: Explain what changed and the expected compile outcome.',
      '   - Summarize each edit briefly (e.g., "Added \\usepackage{booktabs} to preamble").',
      '   - Note any follow-up actions the user may need (e.g., "Run biber to update citations").',
    ].join('\n')
  )

  if (options.isMultiFile) {
    sections.push(
      [
        'Multi-file Edit Rules:',
        '- Read ALL relevant files first (INSPECT phase) before making any edits.',
        '- Edit files in logical dependency order (e.g., .sty/.cls before .tex that imports them).',
        '- If edits span multiple files, group related changes and explain the cross-file impact.',
      ].join('\n')
    )
  }

  if (options.hasCompileError) {
    sections.push(
      [
        'Compile Error Context:',
        '- A compile error is present. Focus your edits on resolving it.',
        '- Trace the error to its root cause before editing -- the reported line may not be the source.',
        '- Common root causes: missing \\end{}, unmatched braces, missing packages, typos in commands.',
        '- After applying the fix, explain why this resolves the error.',
      ].join('\n')
    )
  }

  return sections.join('\n\n')
}
