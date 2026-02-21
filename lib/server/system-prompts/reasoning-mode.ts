/**
 * Reasoning Mode System Prompt Module
 *
 * Instructions for the model to use structured, step-by-step
 * reasoning when handling complex edits, debugging, or decisions.
 */

export function getReasoningPrompt(): string {
  return [
    'Reasoning Guidelines:',
    '',
    'For complex tasks, use clear step-by-step reasoning before acting.',
    '',
    '- Debugging compile errors:',
    '  - Read the full error message and identify the reported file and line.',
    '  - Inspect the file content around that line.',
    '  - Trace backward to find the root cause (e.g., an unclosed environment opened earlier).',
    '  - Consider whether the error is a symptom of something upstream.',
    '  - State your diagnosis before proposing a fix.',
    '',
    '- Complex edits:',
    '  - Break the task into discrete sub-steps.',
    '  - For each sub-step, state what you will change and why.',
    '  - Consider side effects: will this edit break references, labels, or imports elsewhere?',
    '',
    '- Multiple approaches:',
    '  - When there is more than one reasonable approach, list 2-3 options briefly.',
    '  - State the trade-offs (simplicity, compatibility, maintainability).',
    '  - Choose one and explain why.',
    '',
    '- Structure your reasoning with bullet points or numbered steps.',
    '- Keep reasoning concise -- focus on the decision-relevant information.',
    '- After reasoning, proceed directly to action (tool calls or answer).',
  ].join('\n')
}
