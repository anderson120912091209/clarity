# LaTeX Compilation Service Proposal

## 1. Executive Summary

This document proposes a re-architecture of the current LaTeX compilation system used in Jules. The goal is to evolve the current simple Flask-based backend into a robust, scalable, and secure compilation service inspired by Overleaf's Common LaTeX Service Interface (CLSI).

The proposed architecture introduces **containerized execution**, **concurrency management**, and a **modular design** that decouples the API from the execution environment.

## 2. Current System Analysis

### Architecture

Currently, the system is a monolithic Flask application (`railway-api`) that handles both the API requests and the LaTeX compilation.

- **Stack**: Python, Flask, `pdflatex` (installed directly in the API container).
- **Flow**:
  1. Frontend sends all project files to `POST /`.
  2. Backend saves files to a temporary directory.
  3. Backend runs `subprocess.run(['pdflatex', '-shell-escape', ...])` directly on the host machine (inside the container).
  4. PDF is returned; temp files are deleted.

### Limitations & Risks

1.  **Security Vulnerability**: Running `pdflatex -shell-escape` inside the main API container is high-risk. Malicious LaTeX code could compromise the web service.
2.  **Performance Overheard**: Every compilation request re-sends _all_ files. There is no incremental syncing or caching.
3.  **Concurrency**: The synchronous, blocking nature of the current implementation makes it difficult to handle multiple concurrent compilations efficiently without blocking the API worker.
4.  **No Isolation**: If a compilation crashes the system (e.g., memory exhaustion), the entire API service goes down.

## 3. Proposed Architecture (CLSI-Inspired)

The new architecture decouples the **Management Layer** (API/Orchestration) from the **Execution Layer** (compilation runners).

### High-Level Diagram

```mermaid
graph TD
    %% Styling
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef api fill:#d4e1f5,stroke:#333,stroke-width:2px;
    classDef worker fill:#ffebcd,stroke:#333,stroke-width:2px;
    classDef storage fill:#e1f5fe,stroke:#333,stroke-width:2px;

    Client[Frontend (Next.js)]:::client -- HTTP POST /compile --> API[Compilation Service]:::api

    subgraph "Compilation Service (Node.js/Python)"
        API -- "1. Parse & Auth" --> CM[CompileManager]
        CM -- "2. Sync Files" --> RM[ResourceManager]
        CM -- "3. Acquire Lock" --> LM[LockManager]
        CM -- "4. Dispatch" --> ER[ExecutionRunner]
    end

    subgraph "Execution Layer"
        ER -- "Spawns" --> Worker[Docker Container]:::worker
        Worker -- "Runs" --> Latex[latexmk / pdflatex]
    end

    subgraph "Storage / Cache"
        RM -.-> |Read/Write| Disk[Temp/Cache Storage]:::storage
        RM -.-> |Cache| Redis[(Redis Cache)]:::storage
    end
```

### Key Components

#### 1. API & Orchestration Layer

_Recommendation: Migrate to Node.js/TypeScript to share code with the frontend, or restructure existing Python service._

- **CompileManager**: The orchestration engine. It ensures that for a given project, only one compilation runs at a time (Mutex/Locking).
- **RequestParser**: Validates input (sanity checks on `main.tex`, file sizes).
- **ResourceManager**: Manages the file system. Instead of waiting for a full upload, it could accept delta updates or sync from a shared storage (S3/DB) in the future.

#### 2. Execution Layer (The Runners)

The core innovation is moving away from running LaTeX locally.

- **DockerRunner**:
  - **Function**: For each compile request, spin up an _ephemeral_ Docker container (or reuse a warm pool).
  - **Isolation**: The compilation happens in a sandboxed environment with strict resource limits (CPU/RAM) and no network access.
  - **Mechanism**:
    1.  Mount project files (read-only source, write-able output) to the container.
    2.  Run `latexmk` inside the container.
    3.  Stream logs back to the Manager.
    4.  Destroy container on completion.

#### 3. Output & Caching Layer

- **OutputCacheManager**: Stores the resulting PDF and logs.
- **Optimization**: Can serve cached PDFs if inputs haven't changed (based on hash/checksums).

## 4. Workflows

### Standard Compilation Flow

1.  **Request**: User clicks "Compile". Frontend sends changed files (or all files) to the API.
2.  **Prep**: `CompileManager` writes files to a unique workspace (`/tmp/builds/<project-id>`).
3.  **Execute**: `DockerRunner` starts a container:
    ```bash
    docker run --rm \
      -v /tmp/builds/<project-id>:/workdir \
      --network none \
      img/texlive:latest \
      latexmk -pdf -interaction=nonstopmode main.tex
    ```
4.  **Result**: Container exits. API reads generated PDF from `/tmp/builds/<project-id>/main.pdf`.
5.  **Response**: PDF is streamed back to the user.

## 5. Implementation Roadmap

### Phase 1: Containerization & Isolation (Priority)

_Goal: Fix the security risk._

1.  Update the current `railway-api` to use `docker-py` or `subprocess` to run compilations inside a _child_ container instead of the host.
2.  Requires the `railway-api` container to have access to the Docker socket ("Docker-in-Docker").

### Phase 2: Restructuring (Modularity)

1.  Break `main.py` into modules: `CompileManager`, `ResourceManager`, `Runner`.
2.  Implement `latexmk` usage instead of raw `pdflatex` for automatic reference handling (bibtex, etc.).

### Phase 3: Performance (Optimization)

1.  Implement a file hash check to skip compilation if nothing changed.
2.  Add a `CompileQueue` to prevent server overload under high load.

## 6. Comparison Table

| Feature         | Current System              | Proposed Architecture                |
| :-------------- | :-------------------------- | :----------------------------------- |
| **Execution**   | `subprocess.run` (Insecure) | Ephemeral Docker Containers (Secure) |
| **Language**    | Python (Flask)              | Node.js TS (Recommended) or Python   |
| **State**       | Stateless (Full Upload)     | Session-based / Delta-ready          |
| **Concurrency** | Blocking                    | Queue-based / Async                  |
| **Tooling**     | Manual `pdflatex` calls     | `latexmk` automation                 |

## 7. Immediate Next Steps

1.  Decide on language stack (Keep Python vs. Migrate to Node.js).
2.  Prototype the `DockerRunner` component.
3.  Test running `pdflatex` inside a nested container.
