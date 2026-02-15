# Production Deployment Guide

This guide is specific to this repository.

## 1) What I Found In This Repo

- The frontend is a Next.js app with standalone output (`/Users/andersonchen/Downloads/jules-main/next.config.js:3`).
- PDF compile flow in the frontend points to `NEXT_PUBLIC_CLSI_URL` from client code (`/Users/andersonchen/Downloads/jules-main/lib/utils/pdf-utils.ts:225`), not to `railway-api`.
- The committed compose files still wire `railway-api` and `NEXT_PUBLIC_RAILWAY_ENDPOINT_URL` (`/Users/andersonchen/Downloads/jules-main/docker-compose.yml:13`), but this env is effectively unused in runtime code (`/Users/andersonchen/Downloads/jules-main/lib/constants.ts:11`).
- CLSI is the intended production compiler service (`/Users/andersonchen/Downloads/jules-main/services/cltsi/src/server.ts:22`) and exposes a health endpoint at `/status` (`/Users/andersonchen/Downloads/jules-main/services/cltsi/src/api/routes.ts:193`).
- CLSI currently needs Docker daemon access to launch sandboxed compile containers (`/Users/andersonchen/Downloads/jules-main/services/cltsi/src/core/DockerExecutor.ts:22`).

## 2) Mandatory Fixes Before Production

### Fix A: CLSI build/run inconsistency

Current state:
- `services/cltsi` build fails from source (`import.meta` + CommonJS mismatch).
- `services/cltsi` start can fail with module format mismatch.

Recommended fix:
1. In `/Users/andersonchen/Downloads/jules-main/services/cltsi/package.json`, add:
```json
"type": "module"
```
2. Rebuild:
```bash
cd /Users/andersonchen/Downloads/jules-main/services/cltsi
npm ci
npm run build
npm start
```

### Fix B: Frontend build-time public env injection

`NEXT_PUBLIC_*` values used by client code must exist at image build time, not only runtime.

Update `/Users/andersonchen/Downloads/jules-main/Dockerfile` builder stage:
```dockerfile
ARG NEXT_PUBLIC_INSTANT_APP_ID
ARG NEXT_PUBLIC_CLSI_URL
ARG NEXT_PUBLIC_ENABLE_AI_CHAT=false

ENV NEXT_PUBLIC_INSTANT_APP_ID=$NEXT_PUBLIC_INSTANT_APP_ID
ENV NEXT_PUBLIC_CLSI_URL=$NEXT_PUBLIC_CLSI_URL
ENV NEXT_PUBLIC_ENABLE_AI_CHAT=$NEXT_PUBLIC_ENABLE_AI_CHAT
```
Place these before `RUN npm run build`.

### Fix C: Production compose topology

Current compose references legacy `railway-api` and mounts `.next` as a volume (`/Users/andersonchen/Downloads/jules-main/docker-compose.yml:20`), which is not ideal for immutable prod deploys.

Use a dedicated production compose file (example below).

## 3) Recommended Production Architecture

- `web` (Next.js): serves UI + Next API routes (AI/Stripe).
- `clsi` (Node service): sandboxed LaTeX/Typst compilation, exposed at its own domain.
- `caddy` (reverse proxy + TLS): terminates HTTPS and routes traffic.
- Optional: keep `railway-api` only for backward compatibility testing. Do not expose it publicly as primary compile service.

## 4) Environment Variables

### Frontend required
- `NEXT_PUBLIC_INSTANT_APP_ID`
- `NEXT_PUBLIC_CLSI_URL`

### Frontend optional features
- `NEXT_PUBLIC_ENABLE_AI_CHAT`
- `ENABLE_AI_CHAT`
- `GOOGLE_GENERATIVE_AI_API_KEY` (or `GOOGLE_GENERATION_AI_API_KEY`)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (or `NEXT_PUBLIC_STRIPE_PRICE_ID`)

### CLSI required
- `FRONTEND_URL` (must match production frontend origin exactly)

### CLSI recommended tunables
- `COMPILE_TIMEOUT`
- `CACHE_AGE`
- `CACHE_LIMIT`
- `TYPST_ALLOW_NETWORK`
- `LOG_LEVEL`

## 5) Production Compose Template

Create `/Users/andersonchen/Downloads/jules-main/docker-compose.prod.yml`:

```yaml
version: "3.9"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_INSTANT_APP_ID: ${NEXT_PUBLIC_INSTANT_APP_ID}
        NEXT_PUBLIC_CLSI_URL: ${NEXT_PUBLIC_CLSI_URL}
        NEXT_PUBLIC_ENABLE_AI_CHAT: ${NEXT_PUBLIC_ENABLE_AI_CHAT:-false}
    environment:
      NODE_ENV: production
      ENABLE_AI_CHAT: ${ENABLE_AI_CHAT:-false}
      GOOGLE_GENERATIVE_AI_API_KEY: ${GOOGLE_GENERATIVE_AI_API_KEY:-}
      GOOGLE_GENERATION_AI_API_KEY: ${GOOGLE_GENERATION_AI_API_KEY:-}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      NEXT_PUBLIC_STRIPE_PRICE_ID: ${NEXT_PUBLIC_STRIPE_PRICE_ID:-}
    restart: unless-stopped
    depends_on:
      - clsi
    networks:
      - appnet

  clsi:
    build:
      context: ./services/cltsi
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3013
      FRONTEND_URL: ${FRONTEND_URL}
      COMPILE_TIMEOUT: ${COMPILE_TIMEOUT:-60000}
      CACHE_AGE: ${CACHE_AGE:-5400000}
      CACHE_LIMIT: ${CACHE_LIMIT:-2}
      TYPST_ALLOW_NETWORK: ${TYPST_ALLOW_NETWORK:-false}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - clsi_compile:/tmp/clsi/compiles
      - clsi_output:/tmp/clsi/output
    restart: unless-stopped
    networks:
      - appnet

  caddy:
    image: caddy:2.8
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - clsi
    restart: unless-stopped
    networks:
      - appnet

networks:
  appnet:

volumes:
  clsi_compile:
  clsi_output:
  caddy_data:
  caddy_config:
```

Create `/Users/andersonchen/Downloads/jules-main/deploy/Caddyfile`:

```caddyfile
app.example.com {
  reverse_proxy web:3000
}

clsi.example.com {
  reverse_proxy clsi:3013
}
```

## 6) Deployment Steps

1. Provision a Linux VM (Ubuntu 22.04+), attach DNS:
- `app.example.com` -> VM public IP
- `clsi.example.com` -> VM public IP

2. Install Docker + Compose plugin.

3. Clone repo on server:
```bash
git clone <your-repo-url> /opt/jules-main
cd /opt/jules-main
```

4. Create `/opt/jules-main/.env.prod`:
```bash
NEXT_PUBLIC_INSTANT_APP_ID=...
NEXT_PUBLIC_CLSI_URL=https://clsi.example.com
NEXT_PUBLIC_ENABLE_AI_CHAT=true
ENABLE_AI_CHAT=true
GOOGLE_GENERATIVE_AI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID=...
FRONTEND_URL=https://app.example.com
COMPILE_TIMEOUT=60000
CACHE_AGE=5400000
CACHE_LIMIT=2
TYPST_ALLOW_NETWORK=false
LOG_LEVEL=info
```

5. Build and start:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build --pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

6. Smoke checks:
```bash
curl -f https://clsi.example.com/status
curl -I https://app.example.com
docker compose -f docker-compose.prod.yml ps
```

## 7) Production Hardening Checklist

- Put Cloudflare or another WAF/CDN in front of both domains.
- Add request rate limiting for CLSI endpoints at edge/proxy.
- Restrict inbound ports on VM to `22`, `80`, `443`.
- Keep CLSI `FRONTEND_URL` strict (no wildcard origins).
- Track logs centrally (Loki/Datadog/ELK) for `web` + `clsi`.
- Configure uptime alerts on:
  - `https://app.example.com`
  - `https://clsi.example.com/status`
- Pin Docker base image tags and patch monthly.
- Review CLSI seccomp handling (currently `unconfined` in code) before strict-security production.

## 8) CI/CD Baseline

- On each main-branch commit:
  - Run `npm ci && npm run build` (root)
  - Run `cd services/cltsi && npm ci && npm run build`
  - Build container images
  - Deploy with `docker compose pull && docker compose up -d`
- Keep previous image tags for fast rollback.

## 9) Notes About Legacy `railway-api`

- `railway-api` exists and can deploy independently (see `/Users/andersonchen/Downloads/jules-main/railway-api/railway.json`), but current frontend compile path is CLSI-based.
- Treat `railway-api` as legacy/auxiliary unless you intentionally rewire frontend compile flow.
