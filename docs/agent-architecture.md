# Agent Architecture

## Overview

The agent is an AI-powered assistant for LaTeX and Typst document editing, built into
the Clarity collaborative editor. It can read workspace files, diagnose compile errors,
apply targeted code edits, and look up Typst library documentation -- all driven by a
multi-step tool-use loop on top of Google Gemini.

The system is split into a thin Next.js API route (server), a browser-side streaming
parser, and a React component tree that renders text, thinking blocks, tool activity,
and staged file edits in real time.


## System Architecture

```
+-----------+       +--------------+       +---------------+       +-------------------+       +--------+
|           |       |              |       |               |       |                   |       |        |
| ChatPanel +------>+ useChatSession+----->+ chatService   +------>+ POST /api/agent/  +------>+ Gemini |
| (React)   |       | (hook)       |       | .generate()   |       | chat (route.ts)   |       | (LLM)  |
|           |<------+              |<------+               |<------+                   |<------+        |
|           |  UI   |  state mgmt  | async |  HTTP POST +  | SSE   |  auth, normalize, |  API  |        |
|           | update|  & streaming | iter  |  stream parse | stream|  prompt, tools    |       |        |
+-----------+       +--------------+       +---------------+       +-------------------+       +--------+
                           |                                              |
                           v                                              v
                    +----------------+                         +---------------------+
                    | useStreamingState                        | createAgentTools()  |
                    | (state machine)                          | - workspace-tools   |
                    +----------------+                         | - edit-tools        |
                                                               | - compile-tools     |
                                                               | - typst-tools       |
                                                               +---------------------+
```


## Data Flow: A Typical Edit Request

Walk through what happens when a user types **"Fix the missing `\end{itemize}`"**:

### 1. ChatPanel captures input

`ChatPanel` (`features/agent/components/chat-panel.tsx`) renders the `ChatInputArea`.
When the user submits, it calls `handleSendMessage` provided by `useChatSession`.

### 2. useChatSession builds context

The hook (`features/agent/hooks/useChatSession.ts`) assembles an `AgentChatContext`
object containing:

- The conversation message history
- Workspace files (paths + content snapshots)
- The currently active file in the editor
- Compile logs and compile error strings
- User settings (library mode, model preference)

It also extracts memory candidates from previous conversations, builds a memory
system message, and appends an "intro" block describing what context was provided.

### 3. chatService.generate() sends POST

`chatService` (`services/agent/browser/chat/chatService.ts`) is a singleton
`DataStreamChatService` that:

1. Creates an `AbortController` for cancellation.
2. Sends a `POST /api/agent/chat` with `{ messages, model, context }`.
3. Returns an `AsyncIterable<StreamDelta>` that yields parsed stream events.

### 4. Route handler processes the request

`app/api/agent/chat/route.ts` runs a pipeline:

```
auth (authorizeAgentRequest)
  -> quota check (checkFixedQuota)
  -> feature flag (ENABLE_AI_CHAT)
  -> parse & validate messages
  -> normalizeConversationMessages (reject system messages)
  -> normalizeContext (context-normalizer.ts)
  -> prompt security check (evaluatePromptSecurity)
  -> detect feature flags (typstLibraryEnabled, forceStructuredEdits)
  -> buildAgentSystemPrompt (prompt-builder.ts)
  -> resolve Gemini model
  -> analytics capture (PostHog)
  -> runWithModel -> streamText (Vercel AI SDK)
```

### 5. Gemini generates response with tool calls

The `streamText` call configures:

- `temperature: 0.05` for deterministic output
- `maxSteps: 30` (edit intent) or `16` (general queries)
- `toolChoice: 'auto'`
- All 9 tools via `createAgentTools(toolCtx, toolState)`

Gemini streams text deltas, thinking blocks, and tool call requests. When a tool
call is emitted, the Vercel AI SDK executes the tool's `execute` function and feeds
the result back to the model for the next step.

### 6. Stream is returned as an SSE response

`result.toDataStreamResponse()` emits prefix-tagged lines:

| Prefix | Meaning |
|--------|---------|
| `0:` | Text delta |
| `9:` | Tool call (complete) |
| `a:` | Tool result |
| `b:` | Tool call args (partial, streaming) |
| `c:` | Tool call start |
| `e:` | Step finish |
| `d:` | Overall finish |
| `2:` | Annotations (thinking, state transitions) |
| `3:` | Error |

### 7. chatService parses stream into StreamDelta objects

`parseDataStreamLine()` in `chatService.ts` converts each prefixed line into a
`StreamDelta` with optional fields:

```typescript
interface StreamDelta {
  content?: string          // text to render
  thinking?: string         // reasoning/thinking block text
  error?: string            // error message
  done?: boolean            // stream finished
  fileEdit?: FileEditDelta  // a successful file edit result
  toolCall?: ToolCallDelta  // tool call started
  toolResult?: ToolResultDelta  // tool call completed
  stateTransition?: string  // agent state change
  stepMetadata?: { stepIndex, finishReason, toolCallsInStep }
}
```

For `apply_file_edit` tool results, the parser extracts `FileEditDelta` objects that
include the full proposed file content for staging.

### 8. useChatSession updates state

The hook iterates the `AsyncIterable<StreamDelta>` and:

- Appends text content to the assistant message
- Tracks active tool calls (running/completed/failed)
- Stages file edits via `changeManagerService`
- Dispatches events to `useStreamingState` for UI indicators
- Handles errors and abort signals

### 9. ChatPanel renders the response

The component tree renders:

- **ThinkingBlock**: Collapsible reasoning content (when available)
- **AgentActivityPanel**: Live tool call status (e.g., "Running file read...")
- **ChatMarkdown**: The assistant's text response
- **AssistantFileBlock**: Inline diff view for each edited file
- **StreamingIndicator**: Animated status label from the state machine

### 10. User accepts or rejects staged edits

File edits are staged (not immediately applied). The `StagedChangesBar` shows
pending changes. The user can:

- **Accept**: Apply the edit to the actual workspace file
- **Reject**: Discard the proposed change
- **Accept All**: Apply all pending edits at once


## Server-Side Architecture

### Route Handler (`app/api/agent/chat/route.ts`)

The route is deliberately slim. It orchestrates but does not contain business logic:

```
route.ts
  |-- authorizeAgentRequest()     // lib/server/agent-auth.ts
  |-- checkFixedQuota()           // lib/server/rate-limit.ts
  |-- normalizeContext()          // lib/agent/context-normalizer.ts
  |-- evaluatePromptSecurity()    // lib/server/prompt-security.ts
  |-- buildAgentSystemPrompt()    // lib/server/chat-system-prompt.ts
  |-- createAgentTools()          // lib/agent/tools/index.ts
  |-- streamText()                // Vercel AI SDK
```

Key design choices:
- System messages from clients are rejected (prompt injection defense).
- Context is normalized with strict budgets (900K total workspace chars).
- The retry loop handles model-not-found (fallback to default) and transient errors
  (exponential backoff via `retry-policy.ts`).

### Tool-Use Loop

The Vercel AI SDK's `streamText` with `maxSteps` drives a multi-step loop:

```
Step 1: LLM generates text + tool calls
        -> Tools execute (e.g., read_workspace_file)
        -> Results fed back to LLM

Step 2: LLM generates text + more tool calls
        -> Tools execute (e.g., apply_file_edit)
        -> Results fed back to LLM

Step 3: LLM generates final text response
        -> finishReason: "stop"
        -> Stream ends
```

Each step triggers `onStepFinish` which increments `toolCtx.stepIndex` and logs
tool call names and edit counts.

The `maxSteps` value is:
- **30** when the user's message indicates edit intent (`forceStructuredEdits`)
- **16** for general queries

### Tools Reference

| Tool | Purpose | Module |
|------|---------|--------|
| `list_workspace_files` | List available files with optional query filter | `workspace-tools.ts` |
| `read_workspace_file` | Read file content by path (supports line ranges) | `workspace-tools.ts` |
| `search_workspace` | Search across files for text matches | `workspace-tools.ts` |
| `apply_file_edit` | Edit a file (search/replace or full rewrite) | `edit-tools.ts` |
| `get_compile_logs` | Get compile output and error state | `compile-tools.ts` |
| `get_active_file_context` | Get the active editor file info/content | `compile-tools.ts` |
| `list_typst_skill_docs` | List indexed Typst/Touying skill docs | `typst-tools.ts` |
| `search_typst_skill_docs` | Search Typst skill docs by query | `typst-tools.ts` |
| `read_typst_skill_doc` | Read a specific Typst skill doc | `typst-tools.ts` |

### Tool Context and Mutable State

Tools receive two shared objects (`lib/agent/tools/types.ts`):

**ToolContext** (immutable per run):
```typescript
interface ToolContext {
  requestId: string
  context: NormalizedChatContext
  typstLibraryEnabled: boolean
  normalizedActivePath: string | null
  virtualWorkspaceContent: Map<string, string>  // in-memory file layer
  checkpointManager: CheckpointManager
  stepIndex: number
}
```

**ToolMutableState** (shared mutable across tools):
```typescript
interface ToolMutableState {
  hasWorkspaceSurvey: boolean      // has the agent listed/read files?
  applyFileEditAttempts: number    // how many edit attempts so far
  filesReadInRun: Set<string>      // which files were explicitly read
}
```

The mutable state enforces guardrails -- for example, `apply_file_edit` blocks
blind edits if the agent has not read the target file first.

### System Prompt Composition

`buildAgentSystemPrompt()` in `lib/server/chat-system-prompt.ts` uses the
`SystemPromptBuilder` class (`lib/server/system-prompts/prompt-builder.ts`) to
assemble a prompt from composable sections:

```
1. Base identity
   "You are an expert LaTeX and Typst coding assistant..."

2. Domain expertise (conditional)
   - LaTeX expertise (if .tex/.sty/.cls/.bib files present)
   - Typst expertise (if .typ files present)

3. Reasoning mode
   Structured thinking instructions for complex tasks

4. Edit workflow (when forceStructuredEdits is true)
   INSPECT -> PLAN -> EDIT -> VERIFY methodology

5. Workspace context
   File listing, active document, compile status summary

6. Compile debug mode (when compileError exists)
   Prioritize diagnosing and fixing the error

7. Typst skill-doc mode (when typstLibraryEnabled)
   Instructions to search skill docs before proposing Typst syntax

8. Extra instructions (from UI layer)
   e.g., "There is an active compile error..."

9. Security policy (always last)
   Non-disclosure and prompt injection defenses
```

The builder pattern allows sections to be included or excluded based on the
workspace state and user intent.

### File Edit Pipeline

The `apply_file_edit` tool orchestrates a multi-layer pipeline:

**1. File resolution** (`context-normalizer.ts`)
- Resolves the requested path against the workspace snapshot
- Supports exact path match and basename fallback
- Suggests similar paths if not found

**2. Guardrail checks** (`edit-tools.ts`)
- Block blind `replace_file` if the file was not read first
- Block suspiciously small replacements (>75% content reduction)
- Require multi-file investigation for compile errors

**3. Search/replace matching** (`file-edit-matcher.ts`)
`applySearchReplaceWithFallback()` tries 5 matching strategies in order:

| Priority | Strategy | Description |
|----------|----------|-------------|
| 1 | `exact` | Byte-for-byte string match |
| 2 | `normalized_line_endings` | Normalize `\r\n` to `\n` |
| 3 | `trimmed_outer_blank_lines` | Strip leading/trailing blank lines |
| 4 | `fuzzy_line_whitespace` | Normalize per-line whitespace then match |
| 5 | `fuzzy_line_substring` | Per-line substring containment match |

If multiple locations match, the edit is rejected as `ambiguous_match`.

**4. Checkpoint** (`checkpoint-manager.ts`)
Before applying, a snapshot of the current file content is saved. This enables
undo to any step in the agent's run.

**5. Structural validation** (`file-edit-validator.ts`)
- LaTeX: checks brace balance, `\begin`/`\end` environment balance
- Typst: checks brace balance (respecting strings and comments)
- Warnings for empty content or large content reductions
- Pre-existing issues in the original file are filtered out

**6. Virtual workspace update**
The edit is applied to the in-memory `virtualWorkspaceContent` map. Subsequent
tool calls in the same run see the updated content.


## Client-Side Architecture

### Component Tree

```
ChatPanel (orchestrator)
|-- ChatHeader
|-- ThreadList (conversation history sidebar)
|-- StagedChangesBar (accept/reject file edits)
|-- ChatMessageList
|   |-- UserMessage
|   +-- AssistantMessage
|       |-- ThinkingBlock (collapsible reasoning)
|       |-- AgentActivityPanel (live tool status)
|       |-- ChatMarkdown (rendered response)
|       +-- AssistantFileBlock (inline diff for each edit)
|-- StreamingIndicator (state machine label)
+-- ChatInputArea (text input + send/stop controls)
```

`ChatPanel` is a thin orchestrator. It receives workspace props (files, compile
state, active file) and passes them through to `useChatSession`. All business
logic lives in hooks.

### Hooks

**`useChatSession`** (`features/agent/hooks/useChatSession.ts`)

The primary hook managing all chat business logic:
- Conversation state (messages, threads, runs)
- Streaming lifecycle (start, iterate deltas, finish)
- Tool call tracking (running, completed, failed)
- File edit staging via `changeManagerService`
- Memory extraction and recall
- External prompt handling (programmatic chat triggers)
- Thread management (create, switch, archive)

**`useStreamingState`** (`features/agent/hooks/useStreamingState.ts`)

A thin wrapper around the agent state machine:
```typescript
const { runState, stateLabel, isActive, dispatch, reset } = useStreamingState(maxSteps)
```

Exposes:
- `runState`: Current `AgentRunState` value
- `stateLabel`: Human-readable label (e.g., "Running file edit...")
- `isActive`: Whether generation is in progress
- `dispatch(event)`: Feed an `AgentRunEvent` to advance the state
- `reset()`: Return to idle state

### State Machine

The agent state machine (`lib/agent/agent-state-machine.ts`) is a pure, immutable
reducer used on both server and client:

```
                  START_GENERATION
         idle ──────────────────────> llm_generating
                                          |
                              TOOL_CALL_START |
                                          v
                                    tool_executing
                                          |
                              TOOL_CALL_RESULT|
                                          v
                                   tool_result_ready
                                          |
                              STEP_COMPLETE   |
                         (tool_use)  /        \ (stop)
                                    v          v
                             llm_generating   completed

         Any state ──── ERROR ────> error (if non-recoverable)
         Any state ──── ABORT ────> aborted
```

**States**: `idle`, `llm_generating`, `tool_pending`, `tool_executing`,
`tool_result_ready`, `completed`, `error`, `aborted`

**Context** tracks: `stepIndex`, `maxSteps`, `toolCallsCompleted`,
`fileEditsApplied`, `filesRead`, `errors`, `retryCount`, `currentToolName`

Terminal states: `completed`, `error`, `aborted`


## Key Design Decisions

### Why extract tools into separate modules

The original `route.ts` contained all 9 tool definitions inline (~500 lines of
closure-captured logic). Extracting into `workspace-tools.ts`, `edit-tools.ts`,
`compile-tools.ts`, and `typst-tools.ts` provides:
- Independent testability for each tool category
- Clear separation of concerns
- Shared `ToolContext`/`ToolMutableState` replaces closure variables

### Why use a state machine

The streaming UI needs to show different indicators at different stages (thinking,
tool executing, processing result, done). A state machine makes transitions
explicit, prevents impossible states, and is testable without React.

### Why checkpoint before each edit

The agent may apply multiple edits in a single run. If a later edit breaks the
document, the checkpoint system allows reverting to any prior step. This is
especially important because the virtual workspace layer means each edit builds
on the previous one.

### Why validate edits structurally

LLMs sometimes produce structurally invalid edits (unmatched braces, missing
`\end` environments). The validator catches these before they reach the user,
and pre-existing issues are filtered out so the agent is not blamed for problems
it did not introduce.

### Why use a virtual workspace layer

Tools within a single run need to see each other's edits. The
`virtualWorkspaceContent` map provides a consistent view without mutating the
original workspace snapshot. This enables multi-step editing workflows where
the agent reads a file, edits it, then reads it again to verify.
