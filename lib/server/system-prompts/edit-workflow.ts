/**
 * Edit Workflow System Prompt Module
 *
 * Defines the mandatory 3-phase READ-PLAN-EXECUTE workflow
 * for the AI agent when making file edits. The agent reads all
 * relevant files first, plans all changes holistically, then
 * applies all edits in a single batch.
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
      '- You MUST call `apply_file_edit` or `batch_apply_edits` for every edit you intend to make.',
      '- Do NOT claim edits were applied unless you actually emitted tool calls.',
      '- Do NOT respond with narrative-only plans for edit requests.',
      '- Always include a text explanation alongside your tool calls.',
    ].join('\n')
  )

  sections.push(
    [
      'Edit Workflow (mandatory 3-phase sequence):',
      '',
      '1. READ: Read ALL target files with `read_workspace_file` before making any edits.',
      '   - Never skip this step. You need the real content for accurate search_replace matching.',
      '   - If the task involves multiple files, read ALL of them first. Do NOT edit any file before reading all relevant files.',
      '   - If a file does not exist, tell the user and ask how to proceed.',
      '',
      '2. PLAN: In a single text block, describe ALL changes you will make across all files.',
      '   - Identify the exact lines or sections to modify in each file.',
      '   - If multiple approaches exist, briefly state your choice and reasoning.',
      '   - Consider cross-file dependencies and side effects.',
      '   - Do NOT call any edit tools during this phase.',
      '',
      '3. EXECUTE: Apply all edits, then summarize what changed.',
      '   - For single-file edits: use `apply_file_edit` with search_replace.',
      '   - For multi-file edits (2+ files): use `batch_apply_edits` to apply all edits in one call.',
      '   - Prefer search_replace over replace_file for targeted changes.',
      '   - The searchContent must exactly match text from the file you read.',
      '   - Include enough surrounding context in searchContent for a unique match.',
      '   - Keep edits as small as possible -- change only what is needed.',
      '   - After edits are applied, summarize each change briefly.',
    ].join('\n')
  )

  if (options.isMultiFile) {
    sections.push(
      [
        'Multi-file Edit Rules:',
        '- You MUST read ALL relevant files first (READ phase) before making any edits.',
        '- You MUST use `batch_apply_edits` when editing 2 or more files.',
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
