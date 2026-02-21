/**
 * Agent Evaluation Framework - Test Runner
 *
 * Sends each scenario to the running dev server's `/api/agent/chat` endpoint
 * as an HTTP request, collects the streaming response, then scores it.
 *
 * Usage:
 *   1. Start the dev server  (`npm run dev`)
 *   2. Run `npx vitest run lib/agent/__tests__/eval`
 *
 * The runner uses `fetch()` and parses the Vercel AI SDK data-stream format.
 */

import type {
  EvalScenario,
  EvalResult,
  EvalSuiteResult,
} from './types'
import {
  scoreEditAccuracy,
  scoreToolEfficiency,
  scoreReasoningQuality,
  scoreResponseClarity,
  computeOverallScore,
} from './scorers'

// ---------------------------------------------------------------------------
// Data-stream parser helpers
// ---------------------------------------------------------------------------

interface ParsedStreamData {
  textContent: string
  thinkingContent: string
  toolCalls: Array<{
    toolName: string
    args?: Record<string, unknown>
    result?: unknown
    success: boolean
  }>
  fileEdits: Array<{
    filePath: string
    applied: boolean
    editType?: string
  }>
  errors: string[]
}

/**
 * Parse the Vercel AI SDK data-stream format.
 *
 * Lines use numeric prefixes:
 *   0: text chunk (JSON-encoded string)
 *   2: data array
 *   9: tool call
 *   a: tool result
 *   e: error
 *   d: done signal
 *   g: reasoning/thinking content
 *
 * See https://sdk.vercel.ai/docs/api-reference/stream-protocol
 */
function parseDataStream(raw: string): ParsedStreamData {
  const result: ParsedStreamData = {
    textContent: '',
    thinkingContent: '',
    toolCalls: [],
    fileEdits: [],
    errors: [],
  }

  const pendingToolCalls = new Map<
    string,
    { toolName: string; args?: Record<string, unknown> }
  >()

  const lines = raw.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue

    const prefix = line.slice(0, colonIdx)
    const payload = line.slice(colonIdx + 1)

    try {
      switch (prefix) {
        // Text content
        case '0': {
          const text = JSON.parse(payload) as string
          result.textContent += text
          break
        }

        // Reasoning / thinking content
        case 'g': {
          const text = JSON.parse(payload) as string
          result.thinkingContent += text
          break
        }

        // Tool call start
        case '9': {
          const tc = JSON.parse(payload) as {
            toolCallId: string
            toolName: string
            args: Record<string, unknown>
          }
          pendingToolCalls.set(tc.toolCallId, {
            toolName: tc.toolName,
            args: tc.args,
          })
          break
        }

        // Tool result
        case 'a': {
          const tr = JSON.parse(payload) as {
            toolCallId: string
            result: unknown
          }
          const pending = pendingToolCalls.get(tr.toolCallId)
          const toolName = pending?.toolName ?? 'unknown'
          const args = pending?.args

          const success = !isToolError(tr.result)

          result.toolCalls.push({ toolName, args, result: tr.result, success })

          // Track file edits
          if (
            toolName === 'apply_file_edit' ||
            toolName === 'applyFileEdit'
          ) {
            const filePath =
              (args?.filePath as string) ??
              (args?.file_path as string) ??
              'unknown'
            result.fileEdits.push({
              filePath,
              applied: success,
              editType: (args?.editType as string) ?? undefined,
            })
          }

          pendingToolCalls.delete(tr.toolCallId)
          break
        }

        // Data messages (2:)
        case '2': {
          // Data payloads may contain structured edit confirmations
          try {
            const data = JSON.parse(payload)
            if (Array.isArray(data)) {
              for (const item of data) {
                if (
                  item &&
                  typeof item === 'object' &&
                  'type' in item &&
                  item.type === 'file_edit'
                ) {
                  result.fileEdits.push({
                    filePath: item.filePath ?? 'unknown',
                    applied: item.applied ?? false,
                    editType: item.editType,
                  })
                }
              }
            }
          } catch {
            // Not all data payloads are JSON arrays; ignore parse errors
          }
          break
        }

        // Error
        case 'e': {
          const errPayload = JSON.parse(payload)
          const message =
            typeof errPayload === 'string'
              ? errPayload
              : errPayload?.message ?? JSON.stringify(errPayload)
          result.errors.push(message)
          break
        }

        // Done signal
        case 'd':
          break

        default:
          // Unknown prefix -- ignore
          break
      }
    } catch {
      // JSON parse failures on individual lines are non-fatal
      result.errors.push(`Failed to parse stream line: ${line.slice(0, 120)}`)
    }
  }

  // Any tool calls that never received a result
  pendingToolCalls.forEach((pending) => {
    result.toolCalls.push({
      toolName: pending.toolName,
      args: pending.args,
      success: false,
    })
  })

  return result
}

function isToolError(result: unknown): boolean {
  if (result === null || result === undefined) return true
  if (typeof result === 'string') {
    const lower = result.toLowerCase()
    return (
      lower.includes('error') ||
      lower.includes('failed') ||
      lower.includes('not found')
    )
  }
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>
    if (obj.error || obj.ok === false || obj.success === false) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// EvalRunner
// ---------------------------------------------------------------------------

export interface EvalRunnerOptions {
  model?: string
  baseUrl?: string // defaults to http://localhost:3000
  timeout?: number // per-scenario timeout in ms, defaults to 60000
  verbose?: boolean
  /** Pass the value for the x-agent-token header (must match AGENT_SECRET_TOKEN on server) */
  agentToken?: string
}

export class EvalRunner {
  private baseUrl: string
  private timeout: number
  private verbose: boolean
  private model: string | undefined
  private agentToken: string

  constructor(options: EvalRunnerOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://localhost:3000').replace(/\/$/, '')
    this.timeout = options.timeout ?? 60_000
    this.verbose = options.verbose ?? false
    this.model = options.model
    this.agentToken = options.agentToken ?? process.env.AGENT_SECRET_TOKEN ?? 'eval-test'
  }

  // ---- Run a single scenario ----

  async runScenario(scenario: EvalScenario): Promise<EvalResult> {
    const startMs = Date.now()

    if (this.verbose) {
      console.log(`\n[eval] Running scenario: ${scenario.id} - ${scenario.name}`)
    }

    // Build the request body matching ChatRequestBody
    const body = this.buildRequestBody(scenario)

    let rawStream: string
    try {
      rawStream = await this.callAgent(body)
    } catch (err) {
      const elapsed = Date.now() - startMs
      return this.errorResult(scenario, err, elapsed)
    }

    // Parse streaming response
    const parsed = parseDataStream(rawStream)

    if (this.verbose) {
      console.log(`[eval]   Text length: ${parsed.textContent.length}`)
      console.log(`[eval]   Thinking length: ${parsed.thinkingContent.length}`)
      console.log(`[eval]   Tool calls: ${parsed.toolCalls.length}`)
      console.log(`[eval]   File edits: ${parsed.fileEdits.length}`)
      if (parsed.errors.length > 0) {
        console.log(`[eval]   Errors: ${parsed.errors.join('; ')}`)
      }
    }

    // Build partial result for scoring
    const partialResult: EvalResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: false,
      scores: {
        editAccuracy: 0,
        toolEfficiency: 0,
        reasoningQuality: 0,
        responseClarity: 0,
        overall: 0,
      },
      details: {
        toolCallLog: parsed.toolCalls,
        fileEdits: parsed.fileEdits,
        thinkingContent: parsed.thinkingContent,
        responseContent: parsed.textContent,
        errors: parsed.errors,
      },
      durationMs: Date.now() - startMs,
    }

    // Score each dimension
    partialResult.scores.editAccuracy = scoreEditAccuracy(scenario, partialResult)
    partialResult.scores.toolEfficiency = scoreToolEfficiency(scenario, partialResult)
    partialResult.scores.reasoningQuality = scoreReasoningQuality(scenario, partialResult)
    partialResult.scores.responseClarity = scoreResponseClarity(scenario, partialResult)
    partialResult.scores.overall = computeOverallScore(scenario, partialResult.scores)

    partialResult.passed = partialResult.scores.overall >= 0.5

    if (this.verbose) {
      console.log(`[eval]   Scores:`)
      console.log(`[eval]     editAccuracy:     ${partialResult.scores.editAccuracy.toFixed(2)}`)
      console.log(`[eval]     toolEfficiency:   ${partialResult.scores.toolEfficiency.toFixed(2)}`)
      console.log(`[eval]     reasoningQuality: ${partialResult.scores.reasoningQuality.toFixed(2)}`)
      console.log(`[eval]     responseClarity:  ${partialResult.scores.responseClarity.toFixed(2)}`)
      console.log(`[eval]     overall:          ${partialResult.scores.overall.toFixed(2)}`)
      console.log(`[eval]   Passed: ${partialResult.passed}`)
    }

    return partialResult
  }

  // ---- Run a full suite ----

  async runSuite(
    scenarios: EvalScenario[],
    suiteId?: string
  ): Promise<EvalSuiteResult> {
    const startMs = Date.now()
    const id = suiteId ?? `eval-${Date.now()}`

    if (this.verbose) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[eval] Starting suite: ${id}`)
      console.log(`[eval] Scenarios: ${scenarios.length}`)
      console.log(`${'='.repeat(60)}`)
    }

    const results: EvalResult[] = []

    // Run sequentially to avoid rate limits
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario)
      results.push(result)
    }

    // Aggregate
    const passCount = results.filter((r) => r.passed).length
    const failCount = results.length - passCount

    const avg = (field: keyof EvalResult['scores']) => {
      if (results.length === 0) return 0
      return results.reduce((sum, r) => sum + r.scores[field], 0) / results.length
    }

    const suite: EvalSuiteResult = {
      suiteId: id,
      timestamp: Date.now(),
      model: this.model ?? 'default',
      scenarioCount: scenarios.length,
      passCount,
      failCount,
      averageScores: {
        editAccuracy: avg('editAccuracy'),
        toolEfficiency: avg('toolEfficiency'),
        reasoningQuality: avg('reasoningQuality'),
        responseClarity: avg('responseClarity'),
        overall: avg('overall'),
      },
      results,
      durationMs: Date.now() - startMs,
    }

    if (this.verbose) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[eval] Suite complete: ${id}`)
      console.log(`[eval] Pass: ${passCount} / ${scenarios.length}`)
      console.log(`[eval] Average overall: ${suite.averageScores.overall.toFixed(3)}`)
      console.log(`[eval] Duration: ${(suite.durationMs / 1000).toFixed(1)}s`)
      console.log(`${'='.repeat(60)}\n`)
    }

    return suite
  }

  // ---- Private helpers ----

  private buildRequestBody(scenario: EvalScenario): Record<string, unknown> {
    const workspaceFiles = scenario.workspaceFiles.map((f, i) => ({
      fileId: `eval-file-${i}`,
      path: f.path,
      content: f.content,
    }))

    const activeFile = scenario.activeFilePath
      ? workspaceFiles.find((f) => f.path === scenario.activeFilePath)
      : workspaceFiles[0]

    return {
      messages: [{ role: 'user', content: scenario.prompt }],
      model: this.model,
      context: {
        userId: 'eval-runner',
        activeFileId: activeFile?.fileId ?? null,
        activeFileName: activeFile
          ? activeFile.path.split('/').pop()
          : null,
        activeFilePath: activeFile?.path ?? null,
        activeFileContent: activeFile?.content ?? '',
        workspaceFiles,
        compile: {
          error: scenario.compileError ?? null,
          logs: scenario.compileLogs ?? null,
        },
        settings: {
          includeCurrentDocument: true,
          webEnabled: false,
          libraryEnabled: false,
        },
      },
    }
  }

  private async callAgent(body: Record<string, unknown>): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-token': this.agentToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(
          `Agent API returned ${response.status}: ${text.slice(0, 300)}`
        )
      }

      // Read the full streaming body as text
      const text = await response.text()
      return text
    } finally {
      clearTimeout(timer)
    }
  }

  private errorResult(
    scenario: EvalScenario,
    err: unknown,
    durationMs: number
  ): EvalResult {
    const message =
      err instanceof Error ? err.message : String(err)

    if (this.verbose) {
      console.error(`[eval]   ERROR: ${message}`)
    }

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: false,
      scores: {
        editAccuracy: 0,
        toolEfficiency: 0,
        reasoningQuality: 0,
        responseClarity: 0,
        overall: 0,
      },
      details: {
        toolCallLog: [],
        fileEdits: [],
        thinkingContent: '',
        responseContent: '',
        errors: [message],
      },
      durationMs,
    }
  }
}
