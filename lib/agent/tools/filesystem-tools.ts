/**
 * Filesystem Tools
 *
 * Tool definitions for creating and deleting files/folders in the workspace.
 * Operations are returned as structured results that the client stages for
 * user approval before committing to the database.
 */

import { tool } from 'ai'
import { z } from 'zod'

import {
  normalizePath,
  resolveWorkspaceFile,
  suggestWorkspacePaths,
} from '../context-normalizer'
import type { ToolContext, ToolMutableState } from './types'
import { addVirtualFile, getVirtualContent, removeVirtualFile } from './types'

function validateFilePath(filePath: string): string | null {
  if (!filePath || !filePath.trim()) return 'File path cannot be empty.'
  if (filePath.includes('..')) return 'File path cannot contain ".." segments.'
  if (filePath.startsWith('/')) return 'File path must be relative (no leading "/").'
  if (/[<>"|?*]/.test(filePath)) return 'File path contains invalid characters.'
  return null
}

export function createFilesystemTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    create_file: tool({
      description:
        'Create a new file in the workspace with the given content. The file must not already exist — use apply_file_edit to modify existing files.',
      parameters: z.object({
        filePath: z
          .string()
          .min(1)
          .describe(
            'Relative path for the new file (e.g. "src/chapter2.tex", "figures/diagram.typ").'
          ),
        content: z
          .string()
          .describe('Initial content for the new file.'),
        description: z
          .string()
          .optional()
          .describe('Brief description of why this file is being created.'),
      }),
      execute: async ({ filePath, content, description }) => {
        const pathError = validateFilePath(filePath)
        if (pathError) {
          return { created: false, error: pathError }
        }

        const normalized = normalizePath(filePath)

        // Check if already deleted in this run (allow re-creation)
        const wasDeleted = state.filesDeletedInRun.has(normalized)

        // Check if file already exists
        const existing = resolveWorkspaceFile(ctx.context.workspaceFiles, filePath)
        if (existing && !wasDeleted) {
          return {
            created: false,
            error: `File already exists at "${existing.path}". Use apply_file_edit to modify it instead.`,
          }
        }

        // Check if already created in this run
        if (state.filesCreatedInRun.has(normalized)) {
          return {
            created: false,
            error: `File "${filePath}" was already created in this run. Use apply_file_edit to modify it.`,
          }
        }

        // Generate a placeholder fileId for virtual workspace tracking
        const virtualFileId = `virtual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        // Add to virtual workspace so subsequent tool calls can find/edit it
        addVirtualFile(ctx, filePath, content, virtualFileId)
        state.filesCreatedInRun.add(normalized)

        // Save checkpoint (empty content as "before" state)
        ctx.checkpointManager.saveCheckpoint(filePath, '', {
          stepIndex: ctx.stepIndex,
          editDescription: description ?? `Create ${filePath}`,
        })

        console.info(`[Agent Chat ${ctx.requestId}] tool=create_file`, {
          filePath,
          contentLength: content.length,
        })

        return {
          created: true,
          actionType: 'create_file' as const,
          filePath,
          content,
          description: description ?? `Create ${filePath}`,
        }
      },
    }),

    create_folder: tool({
      description:
        'Create a new folder in the workspace. Useful for organizing files into a directory structure.',
      parameters: z.object({
        folderPath: z
          .string()
          .min(1)
          .describe(
            'Relative path for the new folder (e.g. "src/chapters", "figures").'
          ),
        description: z
          .string()
          .optional()
          .describe('Brief description of why this folder is being created.'),
      }),
      execute: async ({ folderPath, description }) => {
        const pathError = validateFilePath(folderPath)
        if (pathError) {
          return { created: false, error: pathError }
        }

        console.info(`[Agent Chat ${ctx.requestId}] tool=create_folder`, {
          folderPath,
        })

        return {
          created: true,
          actionType: 'create_folder' as const,
          filePath: folderPath,
          description: description ?? `Create folder ${folderPath}`,
        }
      },
    }),

    delete_file: tool({
      description:
        'Delete a file from the workspace. The deletion is staged for user approval before being committed.',
      parameters: z.object({
        filePath: z
          .string()
          .min(1)
          .describe('Relative path of the file to delete.'),
        reason: z
          .string()
          .optional()
          .describe('Brief reason for deleting this file.'),
      }),
      execute: async ({ filePath, reason }) => {
        const targetFile = resolveWorkspaceFile(ctx.context.workspaceFiles, filePath)
        if (!targetFile) {
          return {
            deleted: false,
            error: `File not found in workspace: "${filePath}"`,
            suggestions: suggestWorkspacePaths(ctx.context.workspaceFiles, filePath, 6),
          }
        }

        // Save checkpoint before deletion
        const currentContent = getVirtualContent(ctx, targetFile)
        ctx.checkpointManager.saveCheckpoint(targetFile.path, currentContent, {
          stepIndex: ctx.stepIndex,
          editDescription: reason ?? `Delete ${targetFile.path}`,
        })

        // Remove from virtual workspace
        removeVirtualFile(ctx, targetFile.normalizedPath)
        state.filesDeletedInRun.add(targetFile.normalizedPath)

        console.info(`[Agent Chat ${ctx.requestId}] tool=delete_file`, {
          filePath: targetFile.path,
          fileId: targetFile.fileId,
        })

        return {
          deleted: true,
          actionType: 'delete_file' as const,
          fileId: targetFile.fileId,
          filePath: targetFile.path,
          reason: reason ?? `Delete ${targetFile.path}`,
        }
      },
    }),
  }
}
