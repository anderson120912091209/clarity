# Next.js Frontend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env vars (required by client bundle)
ARG NEXT_PUBLIC_INSTANT_APP_ID
ARG NEXT_PUBLIC_CLSI_URL
ARG NEXT_PUBLIC_ENABLE_AI_CHAT=false
ARG NEXT_PUBLIC_RAILWAY_ENDPOINT_URL=
ARG NEXT_PUBLIC_STRIPE_PRICE_ID=
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=
ARG NEXT_PUBLIC_POSTHOG_UI_HOST=
ARG NEXT_PUBLIC_POSTHOG_FORCE_REPLAY=false
ARG NEXT_PUBLIC_POSTHOG_USE_PROXY=true

ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_INSTANT_APP_ID=$NEXT_PUBLIC_INSTANT_APP_ID
ENV NEXT_PUBLIC_CLSI_URL=$NEXT_PUBLIC_CLSI_URL
ENV NEXT_PUBLIC_ENABLE_AI_CHAT=$NEXT_PUBLIC_ENABLE_AI_CHAT
ENV NEXT_PUBLIC_RAILWAY_ENDPOINT_URL=$NEXT_PUBLIC_RAILWAY_ENDPOINT_URL
ENV NEXT_PUBLIC_STRIPE_PRICE_ID=$NEXT_PUBLIC_STRIPE_PRICE_ID
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_UI_HOST=$NEXT_PUBLIC_POSTHOG_UI_HOST
ENV NEXT_PUBLIC_POSTHOG_FORCE_REPLAY=$NEXT_PUBLIC_POSTHOG_FORCE_REPLAY
ENV NEXT_PUBLIC_POSTHOG_USE_PROXY=$NEXT_PUBLIC_POSTHOG_USE_PROXY

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
