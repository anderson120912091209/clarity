import posthog from 'posthog-js'

const ingestHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const uiHostFromIngest = ingestHost?.replace('.i.posthog.com', '.posthog.com')

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: '/ingest',
  // ui_host should be the PostHog app host, not the ingestion host.
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? uiHostFromIngest,
  defaults: '2025-11-30',
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Keep explicit so replay doesn't depend on implicit defaults.
  disable_session_recording: false,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === 'development',
  loaded: (ph) => {
    // In local debugging, start recorder explicitly for easier replay troubleshooting.
    if (process.env.NODE_ENV === 'development') {
      ph.startSessionRecording()
    }
  },
})

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
