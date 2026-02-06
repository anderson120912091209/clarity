# Clarity CLSI Service

Common LaTeX Service Interface - A production-grade, sandboxed document compilation service inspired by Overleaf's architecture.

## Features

- **Secure Sandboxing**: Every compilation runs in an isolated Docker container with:
  - Network isolation
  - Seccomp syscall filtering
  - No Linux capabilities
  - Memory and CPU limits
  - Non-root user execution

- **Smart Caching**: Automatic caching of compiled PDFs with age and count-based expiry
- **Concurrency Control**: Project-level locks prevent compilation race conditions
- **Multiple Compilers**: Supports pdflatex, xelatex, and lualatex
- **Typst Support**: Supports Typst compilation via the official Typst CLI image
- **LaTeX Tools**: Uses latexmk for automatic reference/bibliography handling

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (running and accessible)
- TeX Live Docker image: `docker pull texlive/texlive:latest`
- Typst Docker image: `docker pull ghcr.io/typst/typst:latest`

### Installation

```bash
cd services/clsi
npm install
```

### Development

```bash
npm run dev
```

Service will start on port 3013 (configurable via `PORT` env var).

### Testing

```bash
# Basic test
curl -X POST http://localhost:3013/project/test-123/compile \
  -H "Content-Type: application/json" \
  -d '{
    "compiler": "pdflatex",
    "rootResourcePath": "main.tex",
    "resources": [{
      "path": "main.tex",
      "content": "\\documentclass{article}\\n\\begin{document}\\nHello World!\\n\\end{document}"
    }]
  }'

# Retrieve compiled PDF
curl http://localhost:3013/project/test-123/build/{buildId}/output/output.pdf > output.pdf
```

## API Reference

### POST /project/:projectId/compile

Compile a document project (LaTeX or Typst).

**Request:**

```json
{
  "compiler": "pdflatex",
  "rootResourcePath": "main.tex",
  "timeout": 60000,
  "stopOnFirstError": false,
  "resources": [
    {
      "path": "main.tex",
      "content": "LaTeX content here"
    }
  ]
}
```

Typst request example:

```json
{
  "compiler": "typst",
  "rootResourcePath": "main.typ",
  "resources": [
    {
      "path": "main.typ",
      "content": "#set page(width: auto, height: auto)\n= Hello Typst"
    }
  ]
}
```

**Response (Success):**

```json
{
  "status": "success",
  "buildId": "18d4f2e3a1b-a9c8d7e6f5b4",
  "outputFiles": [
    {
      "path": "output.pdf",
      "type": "pdf",
      "url": "/project/test-123/build/18d4f2e3a1b-a9c8d7e6f5b4/output/output.pdf",
      "size": 245632
    }
  ]
}
```

### GET /project/:projectId/build/:buildId/output/:filename

Retrieve a cached output file (PDF, log, etc.).

### DELETE /project/:projectId

Clear all cached builds for a project.

### GET /status

Health check endpoint.

## Configuration

Environment variables:

| Variable          | Description            | Default                  |
| ----------------- | ---------------------- | ------------------------ |
| `HOST`            | Service bind host      | `0.0.0.0`                |
| `PORT`            | Service port           | 3013                     |
| `COMPILE_DIR`     | Compilation directory  | `/tmp/clsi/compiles`     |
| `OUTPUT_DIR`      | Output cache directory | `/tmp/clsi/output`       |
| `TEXLIVE_IMAGE`   | Docker image           | `texlive/texlive:latest` |
| `TYPST_IMAGE`     | Docker image           | `ghcr.io/typst/typst:latest` |
| `TYPST_ALLOW_NETWORK` | Allow Typst package downloads in compile container | `false` |
| `FRONTEND_URL`    | Allowed frontend origin(s) for CORS (comma-separated) | `http://localhost:3000` |
| `COMPILE_TIMEOUT` | Max compile time (ms)  | 60000                    |
| `CACHE_AGE`       | Cache expiry time (ms) | 5400000 (90min)          |
| `CACHE_LIMIT`     | Max builds per project | 2                        |

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /compile
       ▼
┌─────────────────────────────────┐
│  Express API (routes, schemas)  │
└──────────┬──────────────────────┘
           │
           ▼
    ┌──────────────┐
    │CompileManager│ ◄─── LockManager (concurrency)
    └──────┬───────┘
           │
     ┌─────┴────────────┐
     │                  │
     ▼                  ▼
┌──────────────┐  ┌────────────┐
│ResourceManager│  │LatexRunner │
└──────────────┘  └─────┬──────┘
                        │
                        │
                        │      ┌────────────┐
                        └─────▶│TypstRunner │
                               └─────┬──────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │DockerExecutor│
                              └──────┬───────┘
                                     │
                                     ▼
                           ┌──────────────────┐
                           │ Docker Container │
                           │ TeX Live / Typst │
                           └──────────────────┘
```

## Security

- **Path Validation**: All file paths are validated to prevent directory traversal
- **Seccomp Profile**: Whitelist-based syscall filtering
- **Container Isolation**: No network, no capabilities, resource limits
- **Timeout Protection**: Automatic container termination after timeout

Note on Typst packages:
- If your Typst file imports `@preview/...` packages, set `TYPST_ALLOW_NETWORK=true` so Typst can fetch packages from `packages.typst.org`.

## License

MIT
