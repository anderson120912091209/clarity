# Contributing to Clarity

Thanks for contributing. This guide is focused on practical setup and the minimum quality bar for pull requests.

## Ways To Contribute

- Report bugs
- Improve docs
- Fix issues
- Add features
- Add or improve tests

## Development Setup

1. Install root dependencies:

```bash
npm install
```

2. Install CLSI dependencies:

```bash
cd services/cltsi
npm install
cd ../..
```

3. Create `.env.local` in repo root with at least:

```bash
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
NEXT_PUBLIC_CLSI_URL=http://localhost:3013
```

4. Start frontend:

```bash
npm run dev
```

5. Start CLSI in a second terminal:

```bash
cd services/cltsi
FRONTEND_URL=http://localhost:3000 npm run dev
```

6. Open `http://localhost:3000`.

## Branches And Commits

- Create a focused branch for each change.
- Keep commits scoped and readable.
- Avoid mixing refactors with behavior changes unless necessary.

Suggested branch naming:
- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

## Quality Checks Before Opening A PR

Run at repo root:

```bash
npm run lint
npm run test:collab
```

If your changes touch `services/cltsi`, also run:

```bash
cd services/cltsi
npm run lint
npm run test:unit
```

For compiler/runtime changes in CLSI, run integration tests as well:

```bash
cd services/cltsi
npm run test:integration
```

Integration tests require Docker.

## Pull Request Checklist

- The change is scoped to one problem
- Tests were added or updated when behavior changed
- Existing tests pass locally
- Docs were updated (`README.md`, `CONTRIBUTING.md`, or `app/contrib-guide/*`) when relevant
- Environment variable changes are documented
- UI changes include screenshots or short demo clips

## Coding Conventions

- TypeScript-first codebase with strict settings
- Prefer path aliases (`@/...`) where used by the project
- Follow existing formatting style:
  - single quotes
  - no semicolons
  - 120-char print width
- Keep components and modules focused; avoid large mixed-responsibility files

## Subsystem Notes

### Frontend (Next.js)

- Main app routes are under `app/`
- Shared UI/components are under `components/`
- Domain logic lives in `features/` and `lib/`

When changing compile flow, verify `lib/utils/pdf-utils.ts` behavior and user-facing error messages.

### CLSI Service

- Service source is in `services/cltsi/src/`
- It executes compiles in Docker, so test both success and failure paths
- Keep security boundaries in mind (resource path validation, sandbox config, limits)

### Collaboration

- Collaboration code lives under `features/collaboration/`
- Validate both single-user and shared-session behavior when editing collaboration paths

## Documentation Expectations

Update docs in the same PR when you change:
- Setup steps
- Environment variables
- Build/deploy process
- Compile architecture
- Collaboration architecture

Relevant docs:
- `README.md`
- `app/contrib-guide/System_Architecture.md`
- `app/contrib-guide/Live_Collaboration_Architecture.md`
- `app/contrib-guide/Deployment_Guide.md`

## Security

- Never commit secrets or API keys
- Use `.env.local` for local secrets
- For security-sensitive issues, avoid filing public exploit details before maintainers can patch
