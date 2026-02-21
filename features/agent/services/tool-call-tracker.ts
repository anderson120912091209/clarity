/**
 * Tool Call Tracker Service
 *
 * Tracks the lifecycle of tool calls during an agent chat session.
 * Each tool call transitions through: pending -> running -> completed | failed.
 * Supports listener subscriptions for React hook integration.
 */

// --- Types ---

export interface TrackedToolCall {
  toolCallId: string
  toolName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  durationMs?: number
  args?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
}

export interface ToolCallSummary {
  total: number
  completed: number
  failed: number
  running: number
}

// --- Implementation ---

export class ToolCallTracker {
  private calls = new Map<string, TrackedToolCall>()
  private listeners = new Set<() => void>()

  /**
   * Register a new tool call as running.
   * If a call with the same ID already exists it will be overwritten.
   */
  startCall(
    toolCallId: string,
    toolName: string,
    args?: Record<string, unknown>
  ): void {
    this.calls.set(toolCallId, {
      toolCallId,
      toolName,
      status: 'running',
      startedAt: Date.now(),
      args,
    })
    this.notify()
  }

  /**
   * Mark a tool call as successfully completed with its result.
   * Computes the duration from startedAt to now.
   */
  completeCall(
    toolCallId: string,
    result: Record<string, unknown>
  ): void {
    const call = this.calls.get(toolCallId)
    if (!call) return

    const now = Date.now()
    call.status = 'completed'
    call.completedAt = now
    call.durationMs = now - call.startedAt
    call.result = result
    this.notify()
  }

  /**
   * Mark a tool call as failed with an error message.
   * Computes the duration from startedAt to now.
   */
  failCall(toolCallId: string, error: string): void {
    const call = this.calls.get(toolCallId)
    if (!call) return

    const now = Date.now()
    call.status = 'failed'
    call.completedAt = now
    call.durationMs = now - call.startedAt
    call.error = error
    this.notify()
  }

  /** Retrieve a single tracked call by ID, or null if not found. */
  getCall(toolCallId: string): TrackedToolCall | null {
    return this.calls.get(toolCallId) ?? null
  }

  /** Return all tracked calls in insertion order. */
  getAllCalls(): TrackedToolCall[] {
    return Array.from(this.calls.values())
  }

  /** Return only the calls that are currently running. */
  getRunningCalls(): TrackedToolCall[] {
    return this.getAllCalls().filter((c) => c.status === 'running')
  }

  /** Compute aggregate counts across all tracked calls. */
  getSummary(): ToolCallSummary {
    let completed = 0
    let failed = 0
    let running = 0

    for (const call of this.calls.values()) {
      switch (call.status) {
        case 'completed':
          completed++
          break
        case 'failed':
          failed++
          break
        case 'running':
          running++
          break
        // 'pending' is counted only in total
      }
    }

    return {
      total: this.calls.size,
      completed,
      failed,
      running,
    }
  }

  /**
   * Subscribe to state changes. The listener is called whenever a call is
   * started, completed, failed, or the tracker is reset.
   *
   * @returns An unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Clear all tracked calls and notify listeners. */
  reset(): void {
    this.calls.clear()
    this.notify()
  }

  // --- Private ---

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // Swallow listener errors to avoid breaking the tracker
      }
    }
  }
}

/** Default singleton instance for app-wide use. */
export const toolCallTracker = new ToolCallTracker()
