/**
 * Agent Evaluation Framework - Core Types
 *
 * Defines the data structures for eval scenarios, results, and suite summaries
 * used to test the LaTeX/Typst AI agent at scale.
 */

// ---------------------------------------------------------------------------
// Scenario Definition
// ---------------------------------------------------------------------------

export interface EvalScenario {
  id: string
  name: string
  description: string
  category:
    | 'latex_edit'
    | 'typst_edit'
    | 'debug'
    | 'explanation'
    | 'multi_file'
    | 'typst_debug'

  // Setup - the workspace state before the agent runs
  workspaceFiles: Array<{ path: string; content: string }>
  activeFilePath?: string
  compileError?: string
  compileLogs?: string

  // User prompt
  prompt: string

  // Expected outcomes
  expectedEdits?: Array<{
    filePath: string
    mustContain?: string[] // Strings that must appear in the edited file
    mustNotContain?: string[] // Strings that must NOT appear
  }>
  expectedToolCalls?: Array<{
    toolName: string
    required: boolean // If true, failure if not called
  }>
  expectedReasoningTopics?: string[] // Keywords expected in thinking blocks

  // Scoring weights (all default to 1.0 if not provided)
  weights?: {
    editAccuracy?: number
    toolEfficiency?: number
    reasoningQuality?: number
    responseClarity?: number
  }
}

// ---------------------------------------------------------------------------
// Eval Result (per-scenario)
// ---------------------------------------------------------------------------

export interface EvalResult {
  scenarioId: string
  scenarioName: string
  passed: boolean
  scores: {
    editAccuracy: number // 0-1
    toolEfficiency: number // 0-1
    reasoningQuality: number // 0-1
    responseClarity: number // 0-1
    overall: number // weighted average
  }
  details: {
    toolCallLog: Array<{
      toolName: string
      args?: Record<string, unknown>
      success: boolean
    }>
    fileEdits: Array<{
      filePath: string
      applied: boolean
      editType?: string
    }>
    thinkingContent: string
    responseContent: string
    errors: string[]
  }
  durationMs: number
}

// ---------------------------------------------------------------------------
// Suite-level Result (aggregated over all scenarios)
// ---------------------------------------------------------------------------

export interface EvalSuiteResult {
  suiteId: string
  timestamp: number
  model: string
  scenarioCount: number
  passCount: number
  failCount: number
  averageScores: {
    editAccuracy: number
    toolEfficiency: number
    reasoningQuality: number
    responseClarity: number
    overall: number
  }
  results: EvalResult[]
  durationMs: number
}
