/**
 * Workspace Tools
 *
 * Tool definitions for listing, reading, and searching workspace files.
 * Extracted from the inline tool definitions in the agent chat route.
 */

import { tool } from 'ai'
import { z } from 'zod'

import {
  lineCountOf,
  resolveWorkspaceFile,
  suggestWorkspacePaths,
  getLineMatches,
} from '../context-normalizer'
import type { ToolContext, ToolMutableState } from './types'
import { getVirtualContent } from './types'

export function createWorkspaceTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    list_workspace_files: tool({
      description: 'List files currently available in the workspace snapshot.',
      parameters: z.object({
        query: z.string().optional(),
        limit: z.number().int().min(1).max(300).optional(),
      }),
      execute: async ({ query, limit = 120 }) => {
        state.hasWorkspaceSurvey = true
        const queryLower = query?.trim().toLowerCase()
        const filtered = queryLower
          ? ctx.context.workspaceFiles.filter(
              (file) =>
                file.path.toLowerCase().includes(queryLower) ||
                getVirtualContent(ctx, file).toLowerCase().includes(queryLower)
            )
          : ctx.context.workspaceFiles

        const files = filtered.slice(0, limit).map((file) => ({
          fileId: file.fileId,
          path: file.path,
          lineCount: lineCountOf(getVirtualContent(ctx, file)),
          charCount: getVirtualContent(ctx, file).length,
        }))

        console.info(`[Agent Chat ${ctx.requestId}] tool=list_workspace_files`, {
          hasQuery: Boolean(query?.trim()),
          queryLength: query?.trim().length ?? 0,
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
        state.hasWorkspaceSurvey = true
        const file = resolveWorkspaceFile(ctx.context.workspaceFiles, path)
        if (!file) {
          const suggestions = suggestWorkspacePaths(ctx.context.workspaceFiles, path, 6)
          return {
            found: false,
            message: `File not found in workspace snapshot: ${path}`,
            suggestions,
          }
        }

        const fileContent = getVirtualContent(ctx, file)
        const lines = fileContent.split(/\r?\n/)
        const start = startLine ? Math.max(1, startLine) : 1
        const end = endLine ? Math.min(lines.length, endLine) : lines.length
        const selected = lines.slice(start - 1, end).join('\n')
        state.filesReadInRun.add(file.normalizedPath)

        console.info(`[Agent Chat ${ctx.requestId}] tool=read_workspace_file`, {
          pathProvided: Boolean(path?.trim()),
          start,
          end,
        })

        return {
          found: true,
          path: file.path,
          lineCount: lineCountOf(fileContent),
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
        state.hasWorkspaceSurvey = true
        const queryLower = query.trim().toLowerCase()
        const results = ctx.context.workspaceFiles
          .map((file) => {
            const content = getVirtualContent(ctx, file)
            const pathMatch = file.path.toLowerCase().includes(queryLower)
            const matches = getLineMatches(content, query, 4)
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

        console.info(`[Agent Chat ${ctx.requestId}] tool=search_workspace`, {
          queryLength: query.length,
          results: results.length,
        })

        return {
          query,
          totalMatches: results.length,
          results,
        }
      },
    }),
  }
}
