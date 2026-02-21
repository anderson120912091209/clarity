import { useState, useCallback } from 'react'
import {
  type AgentRunState,
  type AgentRunEvent,
  type AgentRunContext,
  createInitialContext,
  transition,
  isTerminalState,
  getStateLabel,
} from '@/lib/agent/agent-state-machine'

export function useStreamingState(maxSteps = 30) {
  const [ctx, setCtx] = useState<AgentRunContext>(() => createInitialContext(maxSteps))

  const dispatch = useCallback((event: AgentRunEvent) => {
    setCtx((prev) => transition(prev, event))
  }, [])

  const reset = useCallback(() => {
    setCtx(createInitialContext(maxSteps))
  }, [maxSteps])

  return {
    ctx,
    runState: ctx.state,
    currentToolName: ctx.currentToolName,
    stepCount: ctx.stepIndex,
    stateLabel: getStateLabel(ctx.state, ctx.currentToolName),
    isActive: !isTerminalState(ctx.state) && ctx.state !== 'idle',
    isTerminal: isTerminalState(ctx.state),
    dispatch,
    reset,
  }
}
