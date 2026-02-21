import { describe, expect, it } from 'vitest'
import { buildAgentRunIntro } from '../chat-run-intro'

describe('buildAgentRunIntro', () => {
  it('explains compile errors before tools', () => {
    const intro = buildAgentRunIntro({
      prompt: 'Please fix this error',
      compileError: 'Undefined control sequence near \\AtBeginShipout (line 24).',
    })

    expect(intro).toContain('I found a compilation issue:')
    expect(intro).toContain('I will inspect the relevant files and logs first')
  })

  it('returns a diagnostic intro for debug-like prompts without compile error', () => {
    const intro = buildAgentRunIntro({
      prompt: 'Please debug this stack trace and fix it',
      compileError: null,
    })

    expect(intro).toContain('I will diagnose the issue first')
  })

  it('returns empty intro for non-debug prompts', () => {
    const intro = buildAgentRunIntro({
      prompt: 'Write a short summary of this chapter',
      compileError: null,
    })

    expect(intro).toBe('')
  })
})
