/**
 * Compile & Context Tools
 *
 * Tool definitions for retrieving compile logs and active file context.
 * Extracted from the inline tool definitions in the agent chat route.
 */

import { tool } from 'ai'
import { z } from 'zod'

import { MAX_COMPILE_LOG_CHARS, tailWithNotice } from '../context-normalizer'
import type { ToolContext } from './types'

export function createCompileTools(ctx: ToolContext) {
  return {
    get_compile_logs: tool({
      description: 'Get the most recent compile logs and compile error state.',
      parameters: z.object({
        maxChars: z.number().int().min(500).max(MAX_COMPILE_LOG_CHARS).optional(),
      }),
      execute: async ({ maxChars = 8000 }) => {
        const logs = ctx.context.compileLogs
          ? tailWithNotice(ctx.context.compileLogs, Math.max(500, maxChars))
          : ''

        console.info(`[Agent Chat ${ctx.requestId}] tool=get_compile_logs`, {
          hasLogs: Boolean(logs),
          hasError: Boolean(ctx.context.compileError),
        })

        return {
          hasError: Boolean(ctx.context.compileError),
          error: ctx.context.compileError,
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
          activeFileId: ctx.context.activeFileId,
          activeFileName: ctx.context.activeFileName,
          activeFilePath: ctx.context.activeFilePath,
          activeFileContent:
            includeContent && ctx.context.activeFileContent
              ? ctx.context.activeFileContent
              : '[Content omitted]',
        }

        console.info(`[Agent Chat ${ctx.requestId}] tool=get_active_file_context`, {
          includeContent,
          activeFilePath: ctx.context.activeFilePath,
        })

        return payload
      },
    }),
  }
}
