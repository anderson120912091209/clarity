# Agent Tools Reference

This document describes every tool available to the AI agent during a streaming run.
Tools are defined in `lib/agent/tools/` and assembled by the `createAgentTools()`
factory in `lib/agent/tools/index.ts`.

All tools receive two shared objects:
- **ToolContext**: Immutable per-run context (workspace snapshot, feature flags, checkpoint manager)
- **ToolMutableState**: Mutable state shared across tools (survey flags, edit counters, read tracking)

See `lib/agent/tools/types.ts` for the full type definitions.

---

## Tool: list_workspace_files

**Source**: `lib/agent/tools/workspace-tools.ts`

**Purpose**: List files currently available in the workspace snapshot. Used by the
agent to discover what files exist before reading or editing them.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | No | -- | Filter files by path or content match (case-insensitive) |
| `limit` | `number` | No | `120` | Maximum files to return. Min: 1, Max: 300 |

**Returns**:
```typescript
{
  totalFiles: number           // total matches (before limit)
  files: Array<{
    fileId: string             // unique file identifier
    path: string               // original file path
    lineCount: number          // number of lines
    charCount: number          // character count
  }>
}
```

**Side Effects**:
- Sets `state.hasWorkspaceSurvey = true`

**Usage Notes**:
- Called automatically when the agent needs to discover what files exist.
- When `query` is provided, files are filtered by case-insensitive match against
  both the file path and the file content (using virtual/edited content if available).
- The agent should call this before attempting edits on unfamiliar workspaces.

---

## Tool: read_workspace_file

**Source**: `lib/agent/tools/workspace-tools.ts`

**Purpose**: Read the content of a specific file from the workspace by path. Supports
reading a line range for large files.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `path` | `string` | Yes | -- | File path (full relative path or unique basename) |
| `startLine` | `number` | No | `1` | First line to read (1-indexed) |
| `endLine` | `number` | No | last line | Last line to read (inclusive) |

**Returns** (file found):
```typescript
{
  found: true
  path: string                     // canonical file path
  lineCount: number                // total lines in file
  selectedRange: {
    startLine: number
    endLine: number
  }
  content: string                  // file content (selected range)
}
```

**Returns** (file not found):
```typescript
{
  found: false
  message: string                  // "File not found in workspace snapshot: <path>"
  suggestions: string[]            // up to 6 similar paths
}
```

**Side Effects**:
- Sets `state.hasWorkspaceSurvey = true`
- Adds the file's normalized path to `state.filesReadInRun`

**Usage Notes**:
- The path resolver first tries an exact normalized-path match, then falls back to
  basename matching (if the basename is unique in the workspace).
- When the file is not found, the tool returns path suggestions ranked by similarity.
- Reads from the virtual workspace layer, so it reflects any edits applied earlier
  in the same run.
- The agent is expected to call this before applying `replace_file` edits.

---

## Tool: search_workspace

**Source**: `lib/agent/tools/workspace-tools.ts`

**Purpose**: Search across all workspace files for a text query and return matching
files with line-level snippets.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | Yes | -- | Search text (case-insensitive substring match) |
| `maxResults` | `number` | No | `30` | Maximum matching files to return. Min: 1, Max: 80 |

**Returns**:
```typescript
{
  query: string
  totalMatches: number
  results: Array<{
    path: string               // file path
    pathMatch: boolean         // whether the path itself matched the query
    matches: Array<{
      line: number             // 1-indexed line number
      preview: string          // trimmed line content (max 240 chars)
    }>
    score: number              // relevance score (path match = 5, + match count)
  }>
}
```

**Side Effects**:
- Sets `state.hasWorkspaceSurvey = true`

**Usage Notes**:
- Results are sorted by descending relevance score.
- Path matches contribute 5 points to the score; each content line match adds 1 point.
- Up to 4 line-level snippets are returned per file.
- Useful for finding where a macro, environment, or variable is defined across files.

---

## Tool: apply_file_edit

**Source**: `lib/agent/tools/edit-tools.ts`

**Purpose**: Apply a code edit to a workspace file. The primary tool for making
changes to user documents. Supports targeted search/replace or full file replacement.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `filePath` | `string` | Yes | -- | Relative path of the target file |
| `editType` | `enum` | Yes | -- | `"search_replace"` or `"replace_file"` |
| `searchContent` | `string` | No | -- | For search_replace: the exact text to find |
| `replaceContent` | `string` | Yes | -- | The replacement content (or full new content) |
| `description` | `string` | No | -- | Human-readable description of the edit |

**Returns** (success):
```typescript
{
  applied: true
  fileId: string
  filePath: string
  editType: "replace_file"       // always normalized to replace_file for staging
  sourceEditType: string          // original editType requested
  searchContent: null
  replaceContent: string          // full proposed file content
  matchMode: string | null        // how search/replace matched (see below)
  description: string
  validationWarnings?: string[]   // structural warnings/errors from validator
}
```

**Returns** (failure):
```typescript
{
  applied: false
  error: string                   // reason for failure
  suggestions?: string[]          // file path suggestions (if file not found)
}
```

**Match Modes** (for search_replace):

| Mode | Description |
|------|-------------|
| `exact` | Byte-for-byte match found |
| `normalized_line_endings` | Matched after normalizing `\r\n` to `\n` |
| `trimmed_outer_blank_lines` | Matched after trimming leading/trailing blank lines |
| `fuzzy_line_whitespace` | Matched after normalizing per-line whitespace |
| `fuzzy_line_substring` | Each search line found as substring of content line |

**Error Conditions**:

| Error | Cause |
|-------|-------|
| `Target file not found` | Path does not resolve to any workspace file |
| `Read file first` | `replace_file` or missing `searchContent` without prior read |
| `searchContent matched multiple locations` | Ambiguous search target |
| `searchContent does not match` | No match found even with fuzzy fallbacks |
| `searchContent is required` | `search_replace` without `searchContent` |
| `Replacement content too small` | Full rewrite is >75% smaller than original |
| `Compile fix focused on one file` | Multi-edit compile fix without reading other files |
| `Edit produced no changes` | Proposed content identical to current content |

**Side Effects**:
- Increments `state.applyFileEditAttempts`
- Saves a checkpoint via `ctx.checkpointManager`
- Updates virtual workspace content via `setVirtualContent()`
- Runs structural validation via `validateEditDelta()`

**Usage Notes**:
- Always prefer `search_replace` for targeted fixes. Use `replace_file` only for
  full rewrites or new file creation.
- The tool emits the full proposed file content (not just the diff) so the frontend
  can generate a deterministic diff for staging.
- The agent must read the target file before using `replace_file` (unless it is the
  active file already visible in the prompt).
- For `search_replace`, include enough surrounding context lines in `searchContent`
  to disambiguate the target location.

---

## Tool: get_compile_logs

**Source**: `lib/agent/tools/compile-tools.ts`

**Purpose**: Retrieve the most recent compile logs and compile error state.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `maxChars` | `number` | No | `8000` | Maximum characters to return. Min: 500, Max: 26,000 |

**Returns**:
```typescript
{
  hasError: boolean              // whether a compile error exists
  error: string | null           // the compile error string (if any)
  logs: string                   // tail of compile log output
}
```

**Side Effects**: None

**Usage Notes**:
- Logs are returned from the tail (most recent output) to stay within the char budget.
- If no compile logs are available, returns `"No compile logs provided."`.
- The agent should call this when `context.compileError` is set, to understand the
  error before proposing fixes.
- The system prompt automatically instructs the agent to call this tool when a
  compile error is detected.

---

## Tool: get_active_file_context

**Source**: `lib/agent/tools/compile-tools.ts`

**Purpose**: Get metadata and optionally content of the currently active file in the
editor.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `includeContent` | `boolean` | No | `true` | Whether to include the file content |

**Returns**:
```typescript
{
  activeFileId: string | null
  activeFileName: string | null
  activeFilePath: string | null
  activeFileContent: string       // content or "[Content omitted]"
}
```

**Side Effects**: None

**Usage Notes**:
- Returns the file currently open in the user's editor tab.
- Setting `includeContent: false` is useful when the agent only needs to know
  which file is active without consuming token budget for the content.
- The active file content is already included in the workspace snapshot, so this
  tool is primarily for confirming which file the user is looking at.

---

## Tool: list_typst_skill_docs

**Source**: `lib/agent/tools/typst-tools.ts`

**Purpose**: List indexed Typst/Touying local skill documents available for grounded
syntax lookups.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `limit` | `number` | No | `120` | Maximum docs to return. Min: 1, Max: 200 |

**Returns** (enabled):
```typescript
{
  enabled: true
  docs: Array<{
    path: string
    title: string
    // ... other metadata from typst-skill-library
  }>
}
```

**Returns** (disabled):
```typescript
{
  enabled: false
  message: "Typst skill library is disabled for this request..."
}
```

**Side Effects**: None

**Usage Notes**:
- Only available when `typstLibraryEnabled` is true (detected from workspace file
  types, user message content, or explicit setting).
- Returns a disabled message rather than an error when the library is off.
- The agent uses this to discover what Typst documentation is available before
  searching or reading specific docs.

---

## Tool: search_typst_skill_docs

**Source**: `lib/agent/tools/typst-tools.ts`

**Purpose**: Search Typst/Touying local skill docs by query and return top matching
snippets with document paths.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | Yes | -- | Search query |
| `limit` | `number` | No | `8` | Maximum results. Min: 1, Max: 20 |

**Returns** (enabled):
```typescript
{
  enabled: true
  totalMatches: number
  results: Array<{
    path: string
    snippet: string
    score: number
    // ... other fields from typst-skill-library
  }>
}
```

**Returns** (disabled):
```typescript
{
  enabled: false
  message: "Typst skill library is disabled for this request..."
}
```

**Side Effects**: None

**Usage Notes**:
- The system prompt instructs the agent to search skill docs before proposing
  Typst or Touying syntax, to avoid hallucinating function names or parameters.
- Results include snippets for quick relevance assessment.

---

## Tool: read_typst_skill_doc

**Source**: `lib/agent/tools/typst-tools.ts`

**Purpose**: Read a specific Typst/Touying skill document by relative path and
optional line range.

**Parameters**:

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `path` | `string` | Yes | -- | Relative path to the skill doc |
| `startLine` | `number` | No | -- | First line to read (1-indexed) |
| `endLine` | `number` | No | -- | Last line to read (inclusive) |

**Returns** (enabled, found):
```typescript
{
  enabled: true
  found: true
  path: string
  content: string
  // ... other fields from typst-skill-library
}
```

**Returns** (enabled, not found):
```typescript
{
  enabled: true
  found: false
  message: string
}
```

**Returns** (disabled):
```typescript
{
  enabled: false
  message: "Typst skill library is disabled for this request..."
}
```

**Side Effects**: None

**Usage Notes**:
- Used after `search_typst_skill_docs` to read the full content of a matching doc.
- The system prompt tells the agent: "If docs conflict with your training data,
  trust the retrieved docs."
- Supports line ranges for reading specific sections of large documents.

---

## Tool Execution Guardrails

Several cross-tool guardrails are enforced via the shared `ToolMutableState`:

1. **Workspace survey requirement**: `apply_file_edit` implicitly marks the
   workspace as surveyed on first edit, but logs a warning. Explicit listing or
   reading is preferred.

2. **Read-before-edit**: `replace_file` and `search_replace` without
   `searchContent` require that the target file has been read first (tracked via
   `state.filesReadInRun`). The active file is considered "read" by default.

3. **Multi-file investigation**: When there is a compile error and the workspace
   has more than 2 files, the agent must read at least one non-active file before
   applying a second `replace_file` edit.

4. **Edit attempt tracking**: `state.applyFileEditAttempts` counts total edit
   attempts in the run, used by guardrail #3.

5. **Ambiguity protection**: Search/replace rejects edits that match multiple
   locations in the file, forcing the agent to provide more context.
