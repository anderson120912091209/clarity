import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!apiKey) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(
      apiKey,
      {
        host,
        flushAt: 1,
        flushInterval: 0,
      }
    )
    if (process.env.NODE_ENV === 'development') {
      posthogClient.debug(true)
    }
  }
  return posthogClient
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
  }
}
