/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Temporary deploy safeguard: lint still runs in local/CI commands, but won't block `next build`.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'instant-storage.s3.amazonaws.com',
      },
    ],
    // Keep domains for backward compatibility, but remotePatterns is preferred
    domains: ['instant-storage.s3.amazonaws.com'],
  },
  // React 19 compatibility
  reactStrictMode: true,
  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
