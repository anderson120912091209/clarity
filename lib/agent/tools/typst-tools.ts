/**
 * Typst Skill Library Tools
 *
 * Tool definitions for listing, searching, and reading Typst/Touying
 * skill documents. Extracted from the inline tool definitions in the
 * agent chat route.
 */

import { tool } from 'ai'
import { z } from 'zod'

import {
  listTypstSkillDocs,
  readTypstSkillDoc,
  searchTypstSkillDocs,
} from '@/lib/agent/typst-skill-library'
import type { ToolContext, ToolMutableState } from './types'

export function createTypstTools(ctx: ToolContext, _state: ToolMutableState) {
  return {
    list_typst_skill_docs: tool({
      description:
        'List indexed Typst/Touying local skill documents available for grounded syntax lookups.',
      parameters: z.object({
        limit: z.number().int().min(1).max(200).optional(),
      }),
      execute: async ({ limit = 120 }) => {
        if (!ctx.typstLibraryEnabled) {
          return {
            enabled: false,
            message:
              'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
          }
        }

        const docs = await listTypstSkillDocs(limit)

        console.info(`[Agent Chat ${ctx.requestId}] tool=list_typst_skill_docs`, {
          limit,
          returned: docs.docs.length,
        })

        return {
          enabled: true,
          ...docs,
        }
      },
    }),

    search_typst_skill_docs: tool({
      description:
        'Search Typst/Touying local skill docs by query and return top matching snippets with paths.',
      parameters: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, limit = 8 }) => {
        if (!ctx.typstLibraryEnabled) {
          return {
            enabled: false,
            message:
              'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
          }
        }

        const results = await searchTypstSkillDocs(query, limit)

        console.info(`[Agent Chat ${ctx.requestId}] tool=search_typst_skill_docs`, {
          queryLength: query.length,
          totalMatches: results.totalMatches,
          returned: results.results.length,
        })

        return {
          enabled: true,
          ...results,
        }
      },
    }),

    read_typst_skill_doc: tool({
      description:
        'Read a specific Typst/Touying skill document by relative path and optional line range.',
      parameters: z.object({
        path: z.string().min(1),
        startLine: z.number().int().min(1).optional(),
        endLine: z.number().int().min(1).optional(),
      }),
      execute: async ({ path, startLine, endLine }) => {
        if (!ctx.typstLibraryEnabled) {
          return {
            enabled: false,
            message:
              'Typst skill library is disabled for this request. Enable library mode or open a .typ file.',
          }
        }

        const result = await readTypstSkillDoc(path, startLine, endLine)

        console.info(`[Agent Chat ${ctx.requestId}] tool=read_typst_skill_doc`, {
          found: result.found,
          startLine,
          endLine,
        })

        return {
          enabled: true,
          ...result,
        }
      },
    }),
  }
}
