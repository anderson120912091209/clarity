/**
 * Edit Tools
 *
 * Tool definitions for `apply_file_edit` and `batch_apply_edits`.
 * Handles search/replace and full-file edits with fuzzy matching,
 * checkpoint integration, and post-edit validation.
 *
 * Extracted from the inline tool definition in the agent chat route.
 */

import { tool } from 'ai'
import { z } from 'zod'

import {
  resolveWorkspaceFile,
  suggestWorkspacePaths,
  isLikelyLaTeXPath,
} from '../context-normalizer'
import { applySearchReplaceWithFallback } from '../file-edit-matcher'
import { validateEditDelta } from '../file-edit-validator'
import type { ToolContext, ToolMutableState } from './types'
import { getVirtualContent, setVirtualContent } from './types'

// ── Shared edit logic ──

interface EditParams {
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent?: string
  replaceContent: string
  description?: string
}

/**
 * Core edit logic shared by `apply_file_edit` and `batch_apply_edits`.
 * Resolves the target file, validates the edit, applies fuzzy matching,
 * saves a checkpoint, updates the virtual workspace, and returns a
 * structured result.
 */
function applyOneEdit(
  ctx: ToolContext,
  state: ToolMutableState,
  params: EditParams
): Record<string, unknown> {
  const { filePath, editType, searchContent, replaceContent, description } = params

  state.applyFileEditAttempts += 1
  console.info(`[Agent Chat ${ctx.requestId}] tool=apply_file_edit`, {
    editType,
    searchContentLength: searchContent?.length ?? 0,
    replaceContentLength: replaceContent.length,
  })

  const targetFile = resolveWorkspaceFile(ctx.context.workspaceFiles, filePath)
  if (!targetFile) {
    return {
      applied: false,
      error: `Target file not found in workspace snapshot: ${filePath}`,
      suggestions: suggestWorkspacePaths(ctx.context.workspaceFiles, filePath, 6),
    }
  }

  if (
    ctx.context.compileError &&
    ctx.context.workspaceFiles.length > 1 &&
    !state.hasWorkspaceSurvey &&
    state.filesReadInRun.size === 0
  ) {
    // Do not hard-block the first edit attempt; the model may have already
    // read useful context implicitly from the active document in the prompt.
    state.hasWorkspaceSurvey = true
    console.info(`[Agent Chat ${ctx.requestId}] apply_file_edit implicit workspace survey`, {
      targetFile: targetFile.path,
    })
  }

  const fileWasRead =
    state.filesReadInRun.has(targetFile.normalizedPath) ||
    (ctx.normalizedActivePath
      ? targetFile.normalizedPath === ctx.normalizedActivePath
      : false)
  const requiresExplicitRead =
    editType === 'replace_file' ||
    (editType === 'search_replace' && !searchContent)

  if (requiresExplicitRead && !fileWasRead) {
    return {
      applied: false,
      error:
        `Read ${targetFile.path} first using read_workspace_file before applying edits. ` +
        'This guard prevents low-quality blind edits.',
    }
  }

  const hasReadNonActiveFile = Array.from(state.filesReadInRun).some(
    (normalizedPath) => normalizedPath !== ctx.normalizedActivePath
  )
  if (
    ctx.context.compileError &&
    ctx.context.workspaceFiles.length > 2 &&
    state.applyFileEditAttempts >= 2 &&
    editType === 'replace_file' &&
    !hasReadNonActiveFile
  ) {
    return {
      applied: false,
      error:
        'Compile fix is still focused on one file. Read at least one additional candidate file before more edits.',
    }
  }

  const currentContent = getVirtualContent(ctx, targetFile)
  let nextContentForSearchReplace: string | null = null
  let searchReplaceMatchMode: string | null = null

  // Validate search_replace has searchContent
  if (editType === 'search_replace' && !searchContent) {
    return {
      applied: false,
      error: 'searchContent is required for search_replace edit type.',
    }
  }

  if (editType === 'search_replace' && searchContent) {
    const searchReplaceResult = applySearchReplaceWithFallback(
      currentContent,
      searchContent,
      replaceContent
    )

    if (!searchReplaceResult.ok) {
      if (searchReplaceResult.reason === 'ambiguous_match') {
        return {
          applied: false,
          error:
            'searchContent matched multiple locations. Include more surrounding lines to disambiguate the edit target.',
        }
      }

      return {
        applied: false,
        error:
          'searchContent does not match current file snapshot. Re-read the file and use an exact snippet.',
      }
    }

    nextContentForSearchReplace = searchReplaceResult.nextContent
    searchReplaceMatchMode = searchReplaceResult.matchMode
  }

  if (
    editType === 'replace_file' &&
    isLikelyLaTeXPath(targetFile.path) &&
    currentContent.length > 0 &&
    replaceContent.length < Math.floor(currentContent.length * 0.25)
  ) {
    return {
      applied: false,
      error:
        `Replacement content for ${targetFile.path} is much smaller than the existing file. ` +
        'Use search_replace for targeted fixes unless a full rewrite is intentional.',
    }
  }

  // Always emit a full-file snapshot for staging in the frontend.
  // This guarantees deterministic diff generation even when search_replace
  // used fuzzy matching or line-ending normalization.
  const finalProposedContent =
    editType === 'replace_file' ? replaceContent : nextContentForSearchReplace

  if (finalProposedContent === null) {
    return {
      applied: false,
      error:
        'Unable to build final file snapshot for this edit. Re-read file context and retry.',
    }
  }

  if (finalProposedContent === currentContent) {
    return {
      applied: false,
      error:
        'Edit produced no file changes. Refine the target snippet or replacement content.',
    }
  }

  // Save a checkpoint before applying the edit
  ctx.checkpointManager.saveCheckpoint(targetFile.path, currentContent, {
    stepIndex: ctx.stepIndex,
    editDescription: description ?? `Edit ${targetFile.path}`,
  })

  // Validate the edit delta
  const validation = validateEditDelta({
    filePath: targetFile.path,
    originalContent: currentContent,
    proposedContent: finalProposedContent,
  })

  setVirtualContent(ctx, targetFile, finalProposedContent)

  const result: Record<string, unknown> = {
    applied: true,
    fileId: targetFile.fileId,
    filePath: targetFile.path,
    editType: 'replace_file',
    sourceEditType: editType,
    searchContent: null,
    replaceContent: finalProposedContent,
    matchMode: searchReplaceMatchMode,
    description: description ?? `Edit ${targetFile.path}`,
  }

  // Include validation warnings if any
  if (validation.warnings.length > 0 || validation.errors.length > 0) {
    result.validationWarnings = [
      ...validation.errors.map((e) => `[error] ${e}`),
      ...validation.warnings,
    ]
  }

  return result
}

// ── Shared parameter schema ──

const editParamSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .describe('Relative path of the file to edit (e.g. "main.tex", "src/chapter1.typ").'),
  editType: z
    .enum(['search_replace', 'replace_file'])
    .describe(
      'Edit strategy: "search_replace" replaces a specific section, "replace_file" replaces the entire file content.'
    ),
  searchContent: z
    .string()
    .optional()
    .describe(
      'For search_replace: the exact text to find in the file. Must match the existing file content precisely.'
    ),
  replaceContent: z
    .string()
    .describe(
      'The replacement content. For search_replace: replaces the searchContent. For replace_file: the complete new file content.'
    ),
  description: z
    .string()
    .optional()
    .describe('Brief human-readable description of what this edit does.'),
})

// ── Tool definitions ──

export function createEditTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    apply_file_edit: tool({
      description:
        'Apply a code edit to a single file in the workspace. For partial edits, use editType "search_replace". For full file rewrites, use editType "replace_file". When editing 2 or more files, prefer batch_apply_edits instead.',
      parameters: editParamSchema,
      execute: async (params) => {
        return applyOneEdit(ctx, state, params)
      },
    }),

    batch_apply_edits: tool({
      description:
        'Apply multiple file edits in a single batch. Use this when editing 2 or more files. Read all target files first, plan all changes, then apply them together in one call. Each edit in the array is applied sequentially, so later edits can build on earlier ones within the same batch.',
      parameters: z.object({
        edits: z
          .array(editParamSchema)
          .min(1)
          .max(20)
          .describe('Array of edits to apply. Each edit targets a file with a search_replace or replace_file strategy.'),
        planSummary: z
          .string()
          .optional()
          .describe('Brief summary of the overall edit plan for traceability.'),
      }),
      execute: async ({ edits, planSummary }) => {
        state.batchEditAttempts += 1
        console.info(`[Agent Chat ${ctx.requestId}] tool=batch_apply_edits`, {
          editCount: edits.length,
          planSummary: planSummary?.slice(0, 120),
        })

        const results: Record<string, unknown>[] = []
        for (const edit of edits) {
          results.push(applyOneEdit(ctx, state, edit))
        }

        return {
          batchApplied: true,
          planSummary,
          totalEdits: edits.length,
          successCount: results.filter((r) => r.applied).length,
          failureCount: results.filter((r) => !r.applied).length,
          results,
        }
      },
    }),
  }
}
