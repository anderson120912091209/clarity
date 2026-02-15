'use client'

export type NavJourney = 'new_doc_open' | 'project_open'

export type NavMilestone =
  | 'click'
  | 'page_visible'
  | 'project_data_ready'
  | 'editor_ready'
  | 'pdf_ready'
  | 'workspace_ready'

interface NavTrace {
  id: string
  journey: NavJourney
  startedAt: number
  meta: Record<string, unknown>
  milestones: Partial<Record<NavMilestone, number>>
}

interface NavDebugEntry {
  ts: number
  event: string
  payload: Record<string, unknown>
}

declare global {
  interface Window {
    __clarityPerfNav?: NavDebugEntry[]
  }
}

const STORAGE_KEY = 'clarity.perf.nav-trace.v1'
const TRACE_TTL_MS = 2 * 60 * 1000

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function nowMs(): number {
  return Date.now()
}

function createTraceId(): string {
  return `trace_${nowMs()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadTrace(): NavTrace | null {
  if (!isBrowser()) return null

  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as NavTrace
    if (!parsed?.journey || typeof parsed.startedAt !== 'number') {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (nowMs() - parsed.startedAt > TRACE_TTL_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function saveTrace(trace: NavTrace): void {
  if (!isBrowser()) return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trace))
}

function summarizeMilestones(trace: NavTrace): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const [milestone, at] of Object.entries(trace.milestones)) {
    if (typeof at !== 'number') continue
    summary[milestone] = at - trace.startedAt
  }
  return summary
}

function logMilestone(trace: NavTrace, milestone: NavMilestone, meta?: Record<string, unknown>): void {
  const at = trace.milestones[milestone]
  if (typeof at !== 'number') return
  const elapsedMs = at - trace.startedAt
  const payload = {
    traceId: trace.id,
    ...trace.meta,
    ...meta,
    milestonesMs: summarizeMilestones(trace),
  }
  console.info(`[Perf][Nav] ${trace.journey}.${milestone} +${elapsedMs}ms`, payload)

  if (isBrowser()) {
    const entries = window.__clarityPerfNav ?? []
    entries.push({
      ts: nowMs(),
      event: `${trace.journey}.${milestone}`,
      payload,
    })
    window.__clarityPerfNav = entries
  }
}

export function startNavJourney(
  journey: NavJourney,
  meta: Record<string, unknown> = {}
): void {
  if (!isBrowser()) return

  const startedAt = nowMs()
  const trace: NavTrace = {
    id: createTraceId(),
    journey,
    startedAt,
    meta,
    milestones: { click: startedAt },
  }
  saveTrace(trace)
  logMilestone(trace, 'click')
}

export function markNavMilestone(
  milestone: NavMilestone,
  meta: Record<string, unknown> = {}
): void {
  const trace = loadTrace()
  if (!trace) return
  if (trace.milestones[milestone]) return

  trace.milestones[milestone] = nowMs()
  saveTrace(trace)
  logMilestone(trace, milestone, meta)
}

export function completeNavJourney(expectedJourney?: NavJourney): void {
  const trace = loadTrace()
  if (!trace) return
  if (expectedJourney && trace.journey !== expectedJourney) return

  const payload = {
    traceId: trace.id,
    ...trace.meta,
    milestonesMs: summarizeMilestones(trace),
  }
  console.info(`[Perf][Nav] ${trace.journey}.complete`, payload)

  if (isBrowser()) {
    const entries = window.__clarityPerfNav ?? []
    entries.push({
      ts: nowMs(),
      event: `${trace.journey}.complete`,
      payload,
    })
    window.__clarityPerfNav = entries
  }

  clearNavJourney()
}

export function clearNavJourney(): void {
  if (!isBrowser()) return
  window.sessionStorage.removeItem(STORAGE_KEY)
}
