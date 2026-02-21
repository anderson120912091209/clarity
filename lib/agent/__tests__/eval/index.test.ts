/**
 * Agent Evaluation Test Suite
 *
 * Runs the full set of LaTeX and Typst eval scenarios against the agent API.
 *
 * Prerequisites:
 *   - The dev server must be running (`npm run dev`)
 *   - Set EVAL_BASE_URL if the server is not on http://localhost:3000
 *   - Optionally set AGENT_SECRET_TOKEN for auth
 *
 * Run with:
 *   npx vitest run lib/agent/__tests__/eval
 *   # or
 *   npm run test:eval
 */

import { describe, it, expect } from 'vitest'
import { EvalRunner } from './eval-runner'
import { latexScenarios } from './scenarios/latex-scenarios'
import { typstScenarios } from './scenarios/typst-scenarios'

const PASS_THRESHOLD = 0.5

const runner = new EvalRunner({
  baseUrl: process.env.EVAL_BASE_URL || 'http://localhost:3000',
  timeout: Number(process.env.EVAL_TIMEOUT) || 90_000,
  verbose: true,
  model: process.env.EVAL_MODEL || undefined,
  agentToken: process.env.AGENT_SECRET_TOKEN || 'eval-test',
})

// ---------------------------------------------------------------------------
// LaTeX scenarios
// ---------------------------------------------------------------------------

describe('Agent Evaluation Suite', () => {
  describe('LaTeX scenarios', () => {
    for (const scenario of latexScenarios) {
      it(
        scenario.name,
        async () => {
          const result = await runner.runScenario(scenario)

          // Log failures for debugging
          if (!result.passed) {
            console.warn(
              `[FAIL] ${scenario.id}: overall=${result.scores.overall.toFixed(3)}`,
              {
                editAccuracy: result.scores.editAccuracy.toFixed(3),
                toolEfficiency: result.scores.toolEfficiency.toFixed(3),
                reasoningQuality: result.scores.reasoningQuality.toFixed(3),
                responseClarity: result.scores.responseClarity.toFixed(3),
                errors: result.details.errors,
              }
            )
          }

          expect(result.scores.overall).toBeGreaterThan(PASS_THRESHOLD)
          expect(result.passed).toBe(true)
        },
        120_000 // 2 min timeout per scenario
      )
    }
  })

  // ---------------------------------------------------------------------------
  // Typst scenarios
  // ---------------------------------------------------------------------------

  describe('Typst scenarios', () => {
    for (const scenario of typstScenarios) {
      it(
        scenario.name,
        async () => {
          const result = await runner.runScenario(scenario)

          if (!result.passed) {
            console.warn(
              `[FAIL] ${scenario.id}: overall=${result.scores.overall.toFixed(3)}`,
              {
                editAccuracy: result.scores.editAccuracy.toFixed(3),
                toolEfficiency: result.scores.toolEfficiency.toFixed(3),
                reasoningQuality: result.scores.reasoningQuality.toFixed(3),
                responseClarity: result.scores.responseClarity.toFixed(3),
                errors: result.details.errors,
              }
            )
          }

          expect(result.scores.overall).toBeGreaterThan(PASS_THRESHOLD)
          expect(result.passed).toBe(true)
        },
        120_000
      )
    }
  })

  // ---------------------------------------------------------------------------
  // Suite-level summary (runs all scenarios and reports aggregate)
  // ---------------------------------------------------------------------------

  describe('Full suite summary', () => {
    it(
      'runs all scenarios and reports aggregate scores',
      async () => {
        const allScenarios = [...latexScenarios, ...typstScenarios]
        const suiteResult = await runner.runSuite(allScenarios, 'full-eval')

        console.log('\n--- Eval Suite Summary ---')
        console.log(`  Scenarios: ${suiteResult.scenarioCount}`)
        console.log(`  Passed:    ${suiteResult.passCount}`)
        console.log(`  Failed:    ${suiteResult.failCount}`)
        console.log(`  Avg Overall Score: ${suiteResult.averageScores.overall.toFixed(3)}`)
        console.log(`  Duration:  ${(suiteResult.durationMs / 1000).toFixed(1)}s`)
        console.log('')

        // Print per-scenario results
        for (const r of suiteResult.results) {
          const status = r.passed ? 'PASS' : 'FAIL'
          console.log(
            `  [${status}] ${r.scenarioId.padEnd(12)} ${r.scenarioName.padEnd(30)} overall=${r.scores.overall.toFixed(3)} (${r.durationMs}ms)`
          )
        }
        console.log('--- End Summary ---\n')

        // The suite should have a reasonable pass rate
        const passRate = suiteResult.passCount / suiteResult.scenarioCount
        expect(passRate).toBeGreaterThan(0.5)
      },
      600_000 // 10 min timeout for full suite
    )
  })
})
