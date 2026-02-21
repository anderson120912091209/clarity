# Clarity

Collaborative AI-powered scientific editor with support for both LaTeX and Typst.

This repository contains:
- A Next.js web app (editor, preview, projects, collaboration, AI assistant)
- A CLSI compilation service (`services/cltsi`) that compiles LaTeX/Typst in sandboxed Docker containers
- A legacy Flask compiler service (`railway-api`) kept for backward compatibility

## Features

- Monaco-based source editor for `.tex` and `.typ`
- PDF compile + preview flow with cached artifacts
- Real-time collaboration (Liveblocks + Yjs)
- AI chat and quick-edit tools (feature-flagged)
- Project templates and dashboard
- Optional Stripe billing and PostHog analytics

## Architecture At A Glance

- `app/`: Next.js app routes and API endpoints
- `components/`: UI and editor/preview components
- `features/`: collaboration and agent domain logic
- `lib/`: shared utilities, server helpers, config/constants
- `services/cltsi/`: production compile service (Node + Express + Docker)
- `railway-api/`: legacy Flask compile endpoint

For deeper technical docs:
- `app/contrib-guide/System_Architecture.md`
- `app/contrib-guide/Live_Collaboration_Architecture.md`
- `app/contrib-guide/Deployment_Guide.md`

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop (or Docker Engine) running locally
- Recommended Docker images pre-pulled for faster first compile:
  - `texlive/texlive:latest`
  - `ghcr.io/typst/typst:latest`

## Quick Start (Local Development)

1. Install root dependencies:

```bash
npm install
```

2. Install CLSI service dependencies:

```bash
cd services/cltsi
npm install
cd ../..
```

3. Create `.env.local` in repo root (minimum required):

```bash
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
NEXT_PUBLIC_CLSI_URL=http://localhost:3013
```

4. Start the Next.js app:

```bash
npm run dev
```

5. In a second terminal, start CLSI:

```bash
cd services/cltsi
FRONTEND_URL=http://localhost:3000 npm run dev
```

6. Open `http://localhost:3000`.

## Environment Variables

### Core (recommended for most local setups)

- `NEXT_PUBLIC_INSTANT_APP_ID`: InstantDB app ID used by the frontend
- `NEXT_PUBLIC_CLSI_URL`: CLSI base URL used by compile flow (default fallback is `http://localhost:3013`)
- `FRONTEND_URL` (CLSI): allowed CORS origin(s), comma-separated

### Collaboration

- `LIVEBLOCKS_SECRET_KEY`
- `COLLAB_SHARE_SECRET`
- `NEXT_PUBLIC_APP_URL` (used for absolute share links)

### AI Assistant (optional)

- `ENABLE_AI_CHAT`
- `NEXT_PUBLIC_ENABLE_AI_CHAT`
- `GOOGLE_GENERATIVE_AI_API_KEY` (or `GOOGLE_GENERATION_AI_API_KEY`)
- `AGENT_API_KEY` (optional request auth key)
- `AGENT_CHAT_SYSTEM_PROMPT` (optional override)
- `AGENT_QUICK_EDIT_SYSTEM_PROMPT` (optional override)

### Billing (optional)

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (or `NEXT_PUBLIC_STRIPE_PRICE_ID`)

### Analytics (optional)

- `POSTHOG_API_KEY` (or `NEXT_PUBLIC_POSTHOG_KEY`)
- `POSTHOG_HOST` (or `NEXT_PUBLIC_POSTHOG_HOST`)
- `NEXT_PUBLIC_POSTHOG_UI_HOST`

### Compile Rate Limiting (CLSI optional)

- `COMPILE_RATE_LIMIT_ENABLED`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If Upstash variables are omitted, CLSI falls back to in-memory rate limiting.

## Scripts

### Root

- `npm run dev`: run Next.js locally
- `npm run build`: production build
- `npm run start`: run production build
- `npm run lint`: lint frontend app
- `npm run test:collab`: run collaboration tests

### CLSI (`services/cltsi`)

- `npm run dev`: run compile service in watch mode
- `npm run build`: build TypeScript output
- `npm run start`: start built service
- `npm run test`: run all CLSI tests
- `npm run test:unit`: unit tests
- `npm run test:integration`: integration tests (requires Docker)
- `npm run lint`: lint service source

## Docker

- `docker-compose.yml` and `docker-compose.dev.yml` are legacy (frontend + `railway-api`) paths.
- `docker-compose.prod.yml` is the current production topology (`web` + `clsi` + `caddy`).

See `app/contrib-guide/Deployment_Guide.md` for deployment details.

## Contributing

Contributor workflow is documented in:
- `CONTRIBUTING.md`

## License

MIT. See `LICENSE`.

## Acknowledgments

Forked from JulesEditor by [Shelwin Sunga](https://x.com/shelwin_).

