/**
 * Tool Types
 *
 * Shared types for agent tool modules. These replace the closure variables
 * that were previously captured inside the `runWithModel` function in the
 * chat route.
 */

import type { NormalizedWorkspaceFile, NormalizedChatContext } from '../context-normalizer'
import { normalizePath, normalizeBasename, lineCountOf } from '../context-normalizer'
import type { CheckpointManager } from '../checkpoint-manager'

/**
 * Immutable context passed to every tool factory. Values here are set once
 * per streaming run and never mutated by tool executions.
 */
export interface ToolContext {
  requestId: string
  context: NormalizedChatContext
  typstLibraryEnabled: boolean
  normalizedActivePath: string | null
  virtualWorkspaceContent: Map<string, string>
  checkpointManager: CheckpointManager
  stepIndex: number
}

/**
 * Mutable state shared across tools within a single streaming run.
 * Tools read and write these values as side-effects of execution.
 *
 * Using a dedicated object (instead of plain variables) ensures that
 * mutations are visible across all tool closures that hold a reference.
 */
export interface ToolMutableState {
  hasWorkspaceSurvey: boolean
  applyFileEditAttempts: number
  batchEditAttempts: number
  filesReadInRun: Set<string>
  filesCreatedInRun: Set<string>
  filesDeletedInRun: Set<string>
}

// ── Virtual workspace helpers ──

/**
 * Read the current (possibly edited) content of a workspace file.
 * Falls back to the original file content if no virtual edit has been applied.
 */
export function getVirtualContent(
  ctx: ToolContext,
  file: NormalizedWorkspaceFile
): string {
  return ctx.virtualWorkspaceContent.get(file.normalizedPath) ?? file.content
}

/**
 * Write an updated content snapshot for a workspace file into the
 * virtual workspace layer.
 */
export function setVirtualContent(
  ctx: ToolContext,
  file: NormalizedWorkspaceFile,
  content: string
): void {
  ctx.virtualWorkspaceContent.set(file.normalizedPath, content)
}

/**
 * Add a newly created file to the virtual workspace so that subsequent
 * tool calls (e.g. apply_file_edit, read_workspace_file) can find it
 * within the same streaming run.
 */
export function addVirtualFile(
  ctx: ToolContext,
  filePath: string,
  content: string,
  fileId: string
): void {
  const normalized = normalizePath(filePath)
  ctx.virtualWorkspaceContent.set(normalized, content)
  ctx.context.workspaceFiles.push({
    fileId,
    path: filePath,
    normalizedPath: normalized,
    basename: normalizeBasename(filePath),
    content,
    lineCount: lineCountOf(content),
    charCount: content.length,
  })
}

/**
 * Remove a file from the virtual workspace so that subsequent tool calls
 * see it as absent within the same streaming run.
 */
export function removeVirtualFile(
  ctx: ToolContext,
  normalizedFilePath: string
): void {
  ctx.virtualWorkspaceContent.delete(normalizedFilePath)
  const index = ctx.context.workspaceFiles.findIndex(
    (f) => f.normalizedPath === normalizedFilePath
  )
  if (index >= 0) {
    ctx.context.workspaceFiles.splice(index, 1)
  }
}
