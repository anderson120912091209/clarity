import posthog from 'posthog-js'

const ingestHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const uiHostFromIngest = ingestHost?.replace('.i.posthog.com', '.posthog.com')
const forceReplay = process.env.NEXT_PUBLIC_POSTHOG_FORCE_REPLAY === 'true'
const isDevelopment = process.env.NODE_ENV === 'development'
const useProxy =
  process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY === 'true' ||
  (process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY !== 'false' && !isDevelopment)
const apiHost = useProxy ? '/ingest' : ingestHost

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: apiHost,
  // ui_host should be the PostHog app host, not the ingestion host.
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? uiHostFromIngest,
  defaults: '2025-11-30',
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Keep explicit so replay doesn't depend on implicit defaults.
  disable_session_recording: false,
  // Turn on debug in development mode
  debug: isDevelopment,
  loaded: (ph) => {
    if (typeof window !== 'undefined') {
      ;(window as typeof window & { posthog?: typeof ph }).posthog = ph
    }
    // Helpful for validating replay in local/dev without changing project-wide sampling.
    if (isDevelopment || forceReplay) {
      ph.startSessionRecording(true)
    }
  },
})

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
