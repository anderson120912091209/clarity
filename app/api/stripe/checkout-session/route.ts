import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface CheckoutSessionRequestBody {
  priceId?: string
  customerEmail?: string
  successPath?: string
  cancelPath?: string
}

interface StripeCheckoutSessionResponse {
  url?: string
}

interface StripeErrorResponse {
  error?: {
    message?: string
  }
}

function normalizePath(path: string | undefined, fallback: string): string {
  if (!path) return fallback
  return path.startsWith('/') ? path : fallback
}

function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null
  const trimmed = email.trim()
  if (!trimmed || trimmed.length > 254) return null
  return trimmed
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const configuredPriceId = process.env.STRIPE_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured on the server. Missing STRIPE_SECRET_KEY.' },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutSessionRequestBody

  const requestedPriceId = body.priceId?.trim()
  const priceId = requestedPriceId || configuredPriceId

  if (!priceId) {
    return NextResponse.json(
      { error: 'Missing Stripe price ID. Set STRIPE_PRICE_ID or send priceId in the request.' },
      { status: 400 }
    )
  }

  const origin = request.headers.get('origin') ?? request.nextUrl.origin
  const successPath = normalizePath(body.successPath, '/projects?checkout=success')
  const cancelPath = normalizePath(body.cancelPath, '/projects?checkout=cancel')
  const customerEmail = normalizeEmail(body.customerEmail)

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('allow_promotion_codes', 'true')
  params.set('success_url', `${origin}${successPath}`)
  params.set('cancel_url', `${origin}${cancelPath}`)

  if (customerEmail) {
    params.set('customer_email', customerEmail)
  }

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    cache: 'no-store',
  })

  const stripePayload = (await stripeResponse.json().catch(() => ({}))) as
    | StripeCheckoutSessionResponse
    | StripeErrorResponse

  if (!stripeResponse.ok) {
    const message =
      'error' in stripePayload
        ? stripePayload.error?.message ?? 'Stripe rejected the checkout request.'
        : 'Stripe rejected the checkout request.'

    return NextResponse.json({ error: message }, { status: stripeResponse.status })
  }

  const checkoutUrl = 'url' in stripePayload ? stripePayload.url : undefined
  if (!checkoutUrl) {
    return NextResponse.json(
      { error: 'Stripe did not return a checkout URL.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url: checkoutUrl })
}
