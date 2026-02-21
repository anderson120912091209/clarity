/**
 * Retry Policy for Agent LLM Calls
 *
 * Exponential backoff with pattern-based retryable error detection.
 */

export interface RetryPolicy {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryablePatterns: RegExp[]
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  retryablePatterns: [
    /rate limit/i,
    /quota exceeded/i,
    /timeout/i,
    /DEADLINE_EXCEEDED/i,
    /503/,
    /overloaded/i,
    /RESOURCE_EXHAUSTED/i,
    /temporarily unavailable/i,
    /not found|not supported/i, // model not found, fallback to default
  ],
}

export function isRetryableError(error: unknown, policy: RetryPolicy): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return policy.retryablePatterns.some((pattern) => pattern.test(message))
}

export function shouldRetry(
  error: unknown,
  attempt: number,
  policy: RetryPolicy
): boolean {
  if (attempt >= policy.maxRetries) return false
  return isRetryableError(error, policy)
}

export function getRetryDelay(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * policy.baseDelayMs * 0.5
  return Math.min(exponential + jitter, policy.maxDelayMs)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
