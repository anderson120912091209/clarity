/**
 * Workspace Summary Builder
 *
 * Builds a human-readable summary of the workspace state for inclusion
 * in the LLM system prompt, giving the model awareness of available
 * files, active document, and compile status.
 */

import type { NormalizedChatContext } from './context-normalizer'

export function buildWorkspaceSummary(context: NormalizedChatContext): string {
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
