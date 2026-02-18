import { NextResponse } from 'next/server'

const PRODUCT_HUNT_BADGE_URL =
  'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1080188&theme=light'

const BADGE_CACHE_CONTROL = 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400'

const FALLBACK_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="54" viewBox="0 0 250 54" role="img" aria-label="Clarity on Product Hunt">
  <rect width="250" height="54" rx="8" fill="#ffffff" />
  <rect x="1" y="1" width="248" height="52" rx="7" fill="#ffffff" stroke="#e5e7eb" />
  <circle cx="28" cy="27" r="14" fill="#da552f" />
  <text x="28" y="31" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="14" font-weight="700">P</text>
  <text x="52" y="24" fill="#111827" font-family="Arial, sans-serif" font-size="11" font-weight="700">Featured on</text>
  <text x="52" y="39" fill="#111827" font-family="Arial, sans-serif" font-size="14" font-weight="700">Product Hunt</text>
</svg>`

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': BADGE_CACHE_CONTROL,
    },
  })
}

export async function GET() {
  try {
    const badgeResponse = await fetch(PRODUCT_HUNT_BADGE_URL, {
      cache: 'force-cache',
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!badgeResponse.ok) {
      throw new Error(`Product Hunt badge fetch failed with status ${badgeResponse.status}`)
    }

    const badgeSvg = await badgeResponse.text()

    if (!badgeSvg.includes('<svg')) {
      throw new Error('Product Hunt badge response was not SVG')
    }

    return svgResponse(badgeSvg)
  } catch {
    return svgResponse(FALLBACK_BADGE_SVG)
  }
}
