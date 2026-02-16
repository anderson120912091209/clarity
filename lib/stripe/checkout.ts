import posthog from 'posthog-js'

interface StartStripeCheckoutOptions {
  priceId?: string
  customerEmail?: string | null
  distinctId?: string | null
  successPath?: string
  cancelPath?: string
}

interface CheckoutSessionResponse {
  url?: string
  error?: string
}

export async function startStripeCheckout(options: StartStripeCheckoutOptions = {}): Promise<void> {
  const distinctId =
    options.distinctId ??
    (typeof window !== 'undefined' ? posthog.get_distinct_id() : null)

  const response = await fetch('/api/stripe/checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...options,
      distinctId,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as CheckoutSessionResponse

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to start Stripe checkout.')
  }

  if (!payload.url) {
    throw new Error('Stripe checkout URL was not returned.')
  }

  window.location.assign(payload.url)
}
