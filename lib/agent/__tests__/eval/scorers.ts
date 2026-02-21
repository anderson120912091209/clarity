/**
 * Agent Evaluation Framework - Scoring Functions
 *
 * Each scorer examines a specific quality dimension and returns a value
 * between 0 (worst) and 1 (best). The `computeOverallScore` function
 * merges them using per-scenario weights (defaulting to equal weight).
 */

import type { EvalScenario, EvalResult } from './types'

// ---------------------------------------------------------------------------
// Edit Accuracy
// ---------------------------------------------------------------------------

/**
 * Check mustContain / mustNotContain constraints against the file edits
 * recorded in the result. A perfect score requires every constraint to be
 * satisfied. Partial credit is proportional.
 *
 * For edit-category scenarios with no explicit `expectedEdits`, we verify
 * that at least one edit was applied.
 */
export function scoreEditAccuracy(
  scenario: EvalScenario,
  result: EvalResult
): number {
  const expected = scenario.expectedEdits
  if (!expected || expected.length === 0) {
    // For edit scenarios, at least one edit should have been applied
    const isEditCategory = [
      'latex_edit',
      'typst_edit',
      'debug',
      'multi_file',
      'typst_debug',
    ].includes(scenario.category)
    if (isEditCategory) {
      return result.details.fileEdits.some((e) => e.applied) ? 1.0 : 0.0
    }
    // Non-edit scenarios (explanation): no edits expected, full score
    return 1.0
  }

  let totalChecks = 0
  let passedChecks = 0

  for (const expectedEdit of expected) {
    // Find the corresponding edit in the result by matching file path
    const editRecord = result.details.fileEdits.find(
      (e) =>
        e.filePath === expectedEdit.filePath ||
        e.filePath.endsWith(expectedEdit.filePath)
    )

    if (expectedEdit.mustContain) {
      for (const needle of expectedEdit.mustContain) {
        totalChecks += 1
        // Check whether the response text or tool args contain the needle.
        // In a real run the file content would be captured; here we also
        // inspect the response text as a reasonable proxy.
        const foundInResponse = result.details.responseContent.includes(needle)
        const foundInToolArgs = result.details.toolCallLog.some(
          (tc) =>
            tc.args &&
            Object.values(tc.args).some(
              (v) => typeof v === 'string' && v.includes(needle)
            )
        )
        if (editRecord?.applied && (foundInResponse || foundInToolArgs)) {
          passedChecks += 1
        }
      }
    }

    if (expectedEdit.mustNotContain) {
      for (const forbidden of expectedEdit.mustNotContain) {
        totalChecks += 1
        const foundInToolArgs = result.details.toolCallLog.some(
          (tc) =>
            tc.args &&
            Object.values(tc.args).some(
              (v) => typeof v === 'string' && v.includes(forbidden)
            )
        )
        if (!foundInToolArgs) {
          passedChecks += 1
        }
      }
    }

    // If there were no specific string checks, just verify the file was edited
    if (!expectedEdit.mustContain?.length && !expectedEdit.mustNotContain?.length) {
      totalChecks += 1
      if (editRecord?.applied) {
        passedChecks += 1
      }
    }
  }

  return totalChecks === 0 ? 1.0 : passedChecks / totalChecks
}

// ---------------------------------------------------------------------------
// Tool Efficiency
// ---------------------------------------------------------------------------

/**
 * Measures how effectively the agent used its tools:
 *   - Required tools must be called (hard penalty)
 *   - Excessive tool calls (> 2x expectedToolCalls length) reduce score
 *   - read_file before apply_file_edit is the preferred pattern (bonus)
 */
export function scoreToolEfficiency(
  scenario: EvalScenario,
  result: EvalResult
): number {
  const toolLog = result.details.toolCallLog
  const calledToolNames = new Set(toolLog.map((tc) => tc.toolName))

  // ---- required tool checks ----
  const requiredTools = (scenario.expectedToolCalls ?? []).filter(
    (t) => t.required
  )
  if (requiredTools.length > 0) {
    const missingRequired = requiredTools.filter(
      (t) => !calledToolNames.has(t.toolName)
    )
    if (missingRequired.length > 0) {
      // Hard failure: each missing required tool costs proportionally
      return Math.max(
        0,
        1.0 - missingRequired.length / requiredTools.length
      )
    }
  }

  let score = 1.0

  // ---- penalize excessive tool calls ----
  const expectedCount = (scenario.expectedToolCalls ?? []).length || 2
  if (toolLog.length > expectedCount * 2) {
    const excessRatio = toolLog.length / (expectedCount * 2)
    score -= Math.min(0.4, (excessRatio - 1) * 0.2)
  }

  // ---- reward read-before-edit pattern ----
  const editIndex = toolLog.findIndex(
    (tc) =>
      tc.toolName === 'apply_file_edit' || tc.toolName === 'applyFileEdit'
  )
  const readIndex = toolLog.findIndex(
    (tc) => tc.toolName === 'read_file' || tc.toolName === 'readFile'
  )
  if (editIndex >= 0 && readIndex >= 0 && readIndex < editIndex) {
    score = Math.min(1.0, score + 0.1) // small bonus
  }

  // ---- penalize failed tool calls ----
  const failedCalls = toolLog.filter((tc) => !tc.success)
  if (failedCalls.length > 0) {
    score -= Math.min(0.3, failedCalls.length * 0.1)
  }

  return Math.max(0, Math.min(1.0, score))
}

// ---------------------------------------------------------------------------
// Reasoning Quality
// ---------------------------------------------------------------------------

/**
 * Scores the quality of the agent's thinking/reasoning content.
 * If the scenario specifies expectedReasoningTopics, we check coverage.
 * Otherwise, for complex task categories we verify reasoning is present.
 */
export function scoreReasoningQuality(
  scenario: EvalScenario,
  result: EvalResult
): number {
  const thinking = result.details.thinkingContent.toLowerCase()

  if (scenario.expectedReasoningTopics && scenario.expectedReasoningTopics.length > 0) {
    let covered = 0
    for (const topic of scenario.expectedReasoningTopics) {
      if (thinking.includes(topic.toLowerCase())) {
        covered += 1
      }
    }
    return covered / scenario.expectedReasoningTopics.length
  }

  // For complex categories, reasoning should be present
  const complexCategories = ['debug', 'multi_file', 'typst_debug']
  if (complexCategories.includes(scenario.category)) {
    if (thinking.length === 0) return 0.3
    if (thinking.length < 50) return 0.6
    return 1.0
  }

  // For simple categories, any amount of reasoning is fine
  return thinking.length > 0 ? 1.0 : 0.7
}

// ---------------------------------------------------------------------------
// Response Clarity
// ---------------------------------------------------------------------------

/**
 * Scores how clear and well-structured the agent's response is.
 *   - Non-empty response is baseline
 *   - Explains what was changed (for edit scenarios)
 *   - Not overly long for simple edits (>2000 chars is penalized)
 *   - Tool-call-only responses with no explanation are penalized
 */
export function scoreResponseClarity(
  scenario: EvalScenario,
  result: EvalResult
): number {
  const response = result.details.responseContent

  // Empty response
  if (!response || response.trim().length === 0) {
    // If there were tool calls, partial credit
    if (result.details.toolCallLog.length > 0) return 0.3
    return 0.0
  }

  let score = 0.6 // baseline for having any response

  // Check that response mentions something about the change
  const isEditScenario = ['latex_edit', 'typst_edit', 'debug', 'multi_file', 'typst_debug'].includes(
    scenario.category
  )
  if (isEditScenario) {
    const editKeywords = ['changed', 'fixed', 'added', 'updated', 'replaced', 'modified', 'edited', 'removed', 'inserted']
    const mentionsChange = editKeywords.some((kw) =>
      response.toLowerCase().includes(kw)
    )
    if (mentionsChange) score += 0.3

    // Penalize overly long responses for simple edits
    if (
      response.length > 2000 &&
      !['multi_file', 'explanation'].includes(scenario.category)
    ) {
      score -= 0.1
    }
  } else {
    // For explanation scenarios, longer is usually better (up to a point)
    if (response.length > 100) score += 0.2
    if (response.length > 300) score += 0.1
  }

  // Bonus for well-structured output (has paragraphs or code blocks)
  if (response.includes('```') || response.includes('\n\n')) {
    score += 0.1
  }

  return Math.max(0, Math.min(1.0, score))
}

// ---------------------------------------------------------------------------
// Overall Score (weighted average)
// ---------------------------------------------------------------------------

/**
 * Compute the weighted average of all dimension scores.
 * Uses scenario-specified weights, falling back to equal weighting.
 */
export function computeOverallScore(
  scenario: EvalScenario,
  scores: EvalResult['scores']
): number {
  const w = {
    editAccuracy: scenario.weights?.editAccuracy ?? 1.0,
    toolEfficiency: scenario.weights?.toolEfficiency ?? 1.0,
    reasoningQuality: scenario.weights?.reasoningQuality ?? 1.0,
    responseClarity: scenario.weights?.responseClarity ?? 1.0,
  }

  const totalWeight =
    w.editAccuracy + w.toolEfficiency + w.reasoningQuality + w.responseClarity

  if (totalWeight === 0) return 0

  return (
    (scores.editAccuracy * w.editAccuracy +
      scores.toolEfficiency * w.toolEfficiency +
      scores.reasoningQuality * w.reasoningQuality +
      scores.responseClarity * w.responseClarity) /
    totalWeight
  )
}
