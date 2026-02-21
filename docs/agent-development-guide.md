# Agent Development Guide

This guide covers common development tasks for the Clarity AI chat agent: adding tools,
modifying prompts, writing evals, and debugging issues.


## Project Structure

```
lib/agent/
  agent-state-machine.ts       # Pure state machine (states, transitions, helpers)
  checkpoint-manager.ts        # File content snapshots for undo
  context-normalizer.ts        # Raw context -> bounded, normalized representation
  file-edit-matcher.ts         # Search/replace with 5 fallback strategies
  file-edit-validator.ts       # Structural validation for LaTeX/Typst
  retry-policy.ts              # Exponential backoff for transient errors
  chat-run-intro.ts            # "Intro" block describing context provided to the LLM
  workspace-summary.ts         # Workspace snapshot summary for system prompt
  typst-skill-library.ts       # Typst/Touying skill doc index and reader
  tools/
    index.ts                   # createAgentTools() factory
    types.ts                   # ToolContext, ToolMutableState, helpers
    workspace-tools.ts         # list, read, search workspace files
    edit-tools.ts              # apply_file_edit
    compile-tools.ts           # get_compile_logs, get_active_file_context
    typst-tools.ts             # list, search, read Typst skill docs
  __tests__/
    file-edit-matcher.test.ts  # Unit tests for search/replace
    chat-run-intro.test.ts     # Unit tests for intro block
    eval/
      types.ts                 # EvalScenario, EvalResult, EvalSuiteResult

lib/server/
  chat-system-prompt.ts        # buildAgentSystemPrompt() orchestrator
  system-prompts/
    prompt-builder.ts          # SystemPromptBuilder class (composable sections)
    latex-expert.ts            # LaTeX domain expertise prompt
    typst-expert.ts            # Typst domain expertise prompt
    edit-workflow.ts           # 4-step edit workflow (INSPECT/PLAN/EDIT/VERIFY)
    reasoning-mode.ts          # Structured reasoning instructions
  prompt-security.ts           # Prompt injection detection + non-disclosure policy
  agent-auth.ts                # Request authorization
  chat-quota.ts                # Chat quota key builder
  rate-limit.ts                # Fixed quota enforcement

app/api/agent/chat/
  route.ts                     # POST handler (slim orchestrator)

services/agent/browser/chat/
  chatService.ts               # DataStreamChatService (HTTP + stream parser)

features/agent/
  hooks/
    useChatSession.ts          # Main chat business logic hook
    useStreamingState.ts       # State machine wrapper for React
  components/
    chat-panel.tsx             # Orchestrator component
    chat-markdown.tsx          # Markdown renderer
    assistant-file-block.tsx   # Inline diff view for edits
  services/
    chat-threads-store.ts      # Thread/message persistence
    chat-memory-store.ts       # Memory persistence and recall
    memory-extractor.ts        # Extract memory candidates from messages
    change-manager.ts          # Staged file change management
    response-parser.ts         # Parse raw response into structured blocks
  types/
    chat-context.ts            # AgentChatContext, AgentWorkspaceFileContext
```


## Adding a New Tool

### Step 1: Define the tool module

Create a new file in `lib/agent/tools/` or add to an existing module. Follow the
established pattern:

```typescript
// lib/agent/tools/my-new-tools.ts

import { tool } from 'ai'
import { z } from 'zod'
import type { ToolContext, ToolMutableState } from './types'

export function createMyNewTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    my_new_tool: tool({
      description: 'Clear, one-line description of what this tool does.',
      parameters: z.object({
        param1: z.string().min(1).describe('What this parameter is for.'),
        param2: z.number().int().min(1).max(100).optional(),
      }),
      execute: async ({ param1, param2 = 10 }) => {
        // Log the call for debugging
        console.info(`[Agent Chat ${ctx.requestId}] tool=my_new_tool`, {
          param1Length: param1.length,
          param2,
        })

        // Access workspace files through ctx.context.workspaceFiles
        // Access virtual (edited) content through getVirtualContent(ctx, file)
        // Update mutable state through state.xxx

        return {
          success: true,
          data: '...',
        }
      },
    }),
  }
}
```

**Key conventions**:
- Tool names use `snake_case` (required by the AI SDK).
- Parameters use Zod schemas with `.describe()` annotations -- these are visible
  to the LLM as part of the tool definition.
- Always include a `console.info` log with `ctx.requestId` for tracing.
- Return structured objects, not plain strings.

### Step 2: Register in the factory

Add the new tools to `lib/agent/tools/index.ts`:

```typescript
import { createMyNewTools } from './my-new-tools'

export function createAgentTools(ctx: ToolContext, state: ToolMutableState) {
  return {
    ...createWorkspaceTools(ctx, state),
    ...createTypstTools(ctx, state),
    ...createCompileTools(ctx),
    ...createEditTools(ctx, state),
    ...createMyNewTools(ctx, state),  // <-- add here
  }
}
```

### Step 3: Update the system prompt (if needed)

If the tool needs special instructions for the LLM, add a new method to
`SystemPromptBuilder` in `lib/server/system-prompts/prompt-builder.ts`:

```typescript
addMyNewMode(): this {
  this.sections.push(
    [
      'My New Mode:',
      '- Use `my_new_tool` when the user asks about X.',
      '- Always verify the result before presenting it.',
    ].join('\n')
  )
  return this
}
```

Then call it from `buildAgentSystemPrompt()` in `lib/server/chat-system-prompt.ts`
when the relevant conditions are met.

### Step 4: Update the state machine labels (optional)

If you want a human-readable label in the streaming UI, add an entry to the
`formatToolName` function in `lib/agent/agent-state-machine.ts`:

```typescript
const labels: Record<string, string> = {
  // ... existing labels
  my_new_tool: 'running my analysis',
}
```

### Step 5: Write tests

Add test cases in `lib/agent/__tests__/`. At minimum, test:
- Successful execution with valid parameters
- Error handling for invalid inputs
- Edge cases (empty workspace, missing files, etc.)

### Step 6: Add eval scenarios

Create eval scenarios that exercise the new tool. See "Adding Eval Scenarios" below.


## Modifying the System Prompt

### How prompt composition works

The system prompt is built from composable sections by `SystemPromptBuilder`. Each
section is a plain string appended to an internal array. The final prompt joins all
sections with double newlines.

```
builder.addBase()           // always first
builder.addLatexExpertise() // conditional on file types
builder.addTypstExpertise() // conditional on file types
builder.addReasoningMode()  // always included
builder.addEditWorkflow()   // when edit intent detected
builder.addWorkspaceContext()// always included
builder.addCompileDebugMode()// when compile error exists
builder.addTypstLibraryMode()// when Typst library enabled
builder.addExtraInstructions()// from UI layer
builder.addSecurityPolicy() // always last
```

### Adding a new expertise section

1. Create a new file in `lib/server/system-prompts/`:

```typescript
// lib/server/system-prompts/my-expertise.ts

export function getMyExpertisePrompt(): string {
  return [
    'My Expertise Area:',
    '- Key concept 1',
    '- Key concept 2',
    '- When to use this approach',
  ].join('\n')
}
```

2. Add a method to `SystemPromptBuilder`:

```typescript
addMyExpertise(): this {
  this.sections.push(getMyExpertisePrompt())
  return this
}
```

3. Call it from `buildAgentSystemPrompt()` with the appropriate condition.

### Testing prompt changes

- The system prompt is a pure function of its inputs -- test it by calling
  `buildAgentSystemPrompt()` with different context objects and asserting on the
  output string.
- Check that the prompt stays within token budget limits. Very large prompts
  reduce the context window available for conversation history and tool results.
- An environment variable override (`AGENT_CHAT_SYSTEM_PROMPT`) bypasses the
  builder entirely. This is useful for A/B testing prompt variants in production.

### Tips for prompt engineering

- Place the most important instructions at the beginning and end of the prompt
  (primacy and recency effects).
- Be specific about tool usage: "Call `get_compile_logs` before suggesting fixes"
  is better than "Check the compile status."
- The security policy should always be the last section.
- Use numbered steps for workflows the agent should follow.


## Adding Eval Scenarios

### Eval framework types

Eval scenarios are defined in `lib/agent/__tests__/eval/types.ts`:

```typescript
interface EvalScenario {
  id: string
  name: string
  description: string
  category: 'latex_edit' | 'typst_edit' | 'debug' | 'explanation'
            | 'multi_file' | 'typst_debug'

  // Workspace setup
  workspaceFiles: Array<{ path: string; content: string }>
  activeFilePath?: string
  compileError?: string
  compileLogs?: string

  // The user prompt to send
  prompt: string

  // Expected outcomes
  expectedEdits?: Array<{
    filePath: string
    mustContain?: string[]
    mustNotContain?: string[]
  }>
  expectedToolCalls?: Array<{
    toolName: string
    required: boolean
  }>
  expectedReasoningTopics?: string[]

  // Scoring weights (default 1.0)
  weights?: {
    editAccuracy?: number
    toolEfficiency?: number
    reasoningQuality?: number
    responseClarity?: number
  }
}
```

### Writing a good scenario

**1. Start with a clear, reproducible workspace state.**

Provide all the files the agent needs. Do not rely on external state.

```typescript
const scenario: EvalScenario = {
  id: 'fix-missing-end-itemize',
  name: 'Fix missing \\end{itemize}',
  description: 'Agent should detect and fix a missing \\end{itemize} in main.tex',
  category: 'latex_edit',
  workspaceFiles: [
    {
      path: 'main.tex',
      content: [
        '\\documentclass{article}',
        '\\begin{document}',
        '\\begin{itemize}',
        '  \\item First',
        '  \\item Second',
        // Missing \end{itemize}
        '\\end{document}',
      ].join('\n'),
    },
  ],
  activeFilePath: 'main.tex',
  compileError: 'Missing \\end{itemize} at line 7',
  prompt: 'Fix the compile error',
  // ...
}
```

**2. Define expected outcomes precisely.**

```typescript
expectedEdits: [
  {
    filePath: 'main.tex',
    mustContain: ['\\end{itemize}'],
    mustNotContain: ['\\end{enumerate}'],  // wrong fix
  },
],
expectedToolCalls: [
  { toolName: 'get_compile_logs', required: true },
  { toolName: 'read_workspace_file', required: false },
  { toolName: 'apply_file_edit', required: true },
],
```

**3. Choose the right category.**

| Category | Use when |
|----------|----------|
| `latex_edit` | Editing LaTeX files |
| `typst_edit` | Editing Typst files |
| `debug` | Fixing compile errors (LaTeX) |
| `typst_debug` | Fixing compile errors (Typst) |
| `explanation` | Answering questions without edits |
| `multi_file` | Edits spanning multiple files |

**4. Adjust scoring weights for the scenario type.**

For a debug scenario, edit accuracy matters most:
```typescript
weights: {
  editAccuracy: 2.0,
  toolEfficiency: 1.0,
  reasoningQuality: 1.5,
  responseClarity: 0.5,
}
```

### Eval result structure

Each scenario run produces an `EvalResult`:

```typescript
interface EvalResult {
  scenarioId: string
  passed: boolean
  scores: {
    editAccuracy: number     // 0-1: did the edit contain expected content?
    toolEfficiency: number   // 0-1: were the right tools called?
    reasoningQuality: number // 0-1: did thinking cover expected topics?
    responseClarity: number  // 0-1: was the response clear and correct?
    overall: number          // weighted average
  }
  details: {
    toolCallLog: Array<{ toolName, args, success }>
    fileEdits: Array<{ filePath, applied, editType }>
    thinkingContent: string
    responseContent: string
    errors: string[]
  }
  durationMs: number
}
```


## Debugging the Agent

### Inspecting tool calls

**Server-side**: Every tool call logs to the console with `[Agent Chat <requestId>]`:

```
[Agent Chat abc-123] tool=read_workspace_file { pathProvided: true, start: 1, end: 45 }
[Agent Chat abc-123] tool=apply_file_edit { editType: "search_replace", searchContentLength: 120, replaceContentLength: 135 }
[Agent Chat abc-123] step finished { finishReason: "tool-calls", toolCalls: ["read_workspace_file"], step: 1, editsApplied: 0 }
```

Filter logs by `requestId` to trace a single request.

**Client-side**: The `StreamDelta` objects emitted by `chatService` contain
`toolCall` and `toolResult` fields. In `useChatSession`, tool calls are tracked
in a `ToolCallInfo` array:

```typescript
interface ToolCallInfo {
  toolCallId: string
  toolName: string
  status: 'running' | 'completed' | 'failed'
  detail?: string
}
```

### Tracing stream parsing

The stream parser in `chatService.ts` processes lines with single-character prefixes.
To debug parsing issues:

1. Open browser DevTools Network tab and inspect the raw response body of the
   `POST /api/agent/chat` request.
2. Each line should have a recognized prefix (`0:`, `9:`, `a:`, `b:`, `c:`, `e:`,
   `d:`, `2:`, `3:`).
3. The `parseDataStreamLine()` function handles both prefixed lines and JSON objects
   with a `type` field (for compatibility with different AI SDK versions).

### Common issues and fixes

**Issue: "searchContent does not match current file snapshot"**

The LLM's `searchContent` does not match the actual file. Possible causes:
- The LLM hallucinated the content (did not read the file first).
- Whitespace or line ending differences.
- The file was edited by a previous tool call in the same run, but the LLM used
  the original content.

Fix: The 5-level fallback in `file-edit-matcher.ts` handles most whitespace issues.
If the agent consistently fails, check that it is reading the file before editing.

**Issue: "Read file first" error from apply_file_edit**

The guardrail requires the agent to read the target file before applying
`replace_file` edits. This prevents low-quality blind edits.

Fix: The system prompt's edit workflow instructs the agent to INSPECT first. If this
keeps happening, strengthen the edit workflow instructions.

**Issue: Ambiguous match in search/replace**

The `searchContent` matches multiple locations in the file.

Fix: The error message tells the agent to "include more surrounding lines." The
agent should provide a longer, more specific snippet.

**Issue: Tool calls not appearing in the UI**

Check that:
- The `c:` (tool call start) or `9:` (tool call) prefix is being emitted.
- The `parseDataStreamLine()` function is returning a `StreamDelta` with a
  `toolCall` field.
- `useChatSession` is processing the delta and updating the tool call list.

**Issue: State machine stuck in `tool_executing`**

This means a tool call started but no result was received. Possible causes:
- Tool execution timed out.
- The stream was interrupted.
- The tool result prefix (`a:`) was malformed.

Fix: Check server logs for the tool execution. The state machine transitions to
`tool_result_ready` only when a `TOOL_CALL_RESULT` event is dispatched.


## Performance Tips

### Token budget management

The context normalizer enforces hard limits:

| Budget | Limit |
|--------|-------|
| Active file content | 36,000 chars |
| Compile logs | 26,000 chars |
| Max workspace files | 300 |
| Max single file | 90,000 chars |
| Total workspace content | 900,000 chars |

These constants are defined in `lib/agent/context-normalizer.ts`. Adjust them if
you find the agent running out of context window. Remember that the system prompt,
conversation history, and tool results all compete for the same token budget.

### Reducing unnecessary tool calls

- The system prompt should guide the agent to check what it already knows before
  calling tools. For example, the active file content is already in the workspace
  snapshot -- the agent should not re-read it unless it was edited.
- `state.filesReadInRun` tracks which files have been explicitly read. The agent
  can skip re-reading files it has already seen.
- `maxSteps` controls the maximum number of LLM turns. Use `16` for general queries
  and `30` for edit-heavy workflows.

### Optimizing search/replace accuracy

- Encourage the agent to use exact, multi-line snippets for `searchContent`.
- The fuzzy fallback strategies add robustness but can be slower for very large
  files. The `fuzzy_line_substring` strategy requires at least 2 non-empty lines
  and 20 characters to avoid overly broad matches.
- If the agent frequently falls back to fuzzy matching, consider adding
  instructions to the system prompt about providing exact content.

### Streaming performance

- The `DataStreamChatService` processes the stream line-by-line as chunks arrive.
  Incomplete lines are buffered until a newline is received.
- The `onStepFinish` callback in the route logs step completion. If you see many
  steps with no tool calls, the model may be generating unnecessary intermediate
  text.
- Abort handling is supported at both the HTTP level (AbortController) and the
  state machine level (ABORT event). Prompt the user to cancel long-running
  operations.
