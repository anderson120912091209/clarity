/**
 * Agent Tools - Factory
 *
 * Central factory that assembles all agent tool definitions for a single
 * streaming run. Consumers call `createAgentTools(ctx, state)` once per
 * `runWithModel` invocation and pass the result to `streamText({ tools })`.
 */

import { createWorkspaceTools } from './workspace-tools'
import { createTypstTools } from './typst-tools'
import { createCompileTools } from './compile-tools'
import { createEditTools } from './edit-tools'
import type { ToolContext, ToolMutableState } from './types'

export function createAgentTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    ...createWorkspaceTools(ctx, state),
    ...createTypstTools(ctx, state),
    ...createCompileTools(ctx),
    ...createEditTools(ctx, state),
  }
}

export type { ToolContext, ToolMutableState } from './types'
