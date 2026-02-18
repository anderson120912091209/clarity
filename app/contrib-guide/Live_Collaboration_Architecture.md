# Live Collaboration Architecture

## Decision Summary

- **Realtime transport and consistency:** Liveblocks + Yjs (`@liveblocks/yjs` + `y-monaco`) are used for low-latency, conflict-free concurrent editing in Monaco.
- **Durable data:** InstantDB remains source-of-truth persistence for files/projects; editor writes are debounced (longer in collaboration mode) to avoid per-keystroke transactions.
- **Room topology:** one room per project with deterministic ID:
  - `project:{projectId}`
  - active file context is tracked in presence (`fileId`, `filePath`) instead of room identity
- **Presence model:** user cursor, selection, file location, idle state, and active timestamp are carried in Liveblocks presence.
- **Session access model:** server-authenticated Liveblocks access token is minted by `/api/liveblocks-auth`, with role-based permissions (`viewer`, `commenter`, `editor`).
- **Sharing model:** `/api/collab/share-link` issues signed, expiring share tokens (HMAC) scoped to a project/file and role.
- **Comments model:** threaded comments are backed by Liveblocks Threads API and anchored to source ranges via thread metadata.

## Data Boundaries

- **Ephemeral (Liveblocks):**
  - online state, connection status
  - cursors, selections, follow mode
  - thread/comment sync and real-time updates
- **Durable (InstantDB):**
  - project tree, file content snapshots
  - existing compile/PDF/chat metadata

## Sync Policy

- Yjs applies local edits instantly and resolves conflicts with CRDT semantics.
- `cursor-editor-container` still persists file snapshots to InstantDB, but with collaboration-aware debounce (`~1.1s`) to reduce write pressure.
- Presence updates are throttled to avoid noisy updates while preserving cursor responsiveness.

## Security and Permissions

- `/api/liveblocks-auth` validates room identifiers against request project/file.
- If a share token is present, signature and expiry are verified server-side and role is clamped to token scope.
- Role-to-permission mapping:
  - `viewer`: read room + presence + comments read
  - `commenter`: read room + presence + comments write
  - `editor`: room write + comments write
- Editor UI enforces read-only mode for non-editors.

## Operational Notes

- Required env vars:
  - `LIVEBLOCKS_SECRET_KEY`
  - `COLLAB_SHARE_SECRET`
  - `NEXT_PUBLIC_APP_URL` (optional, used for absolute share URL generation)
- Optional telemetry events include join/leave/reconnect, share link creation, comment thread/comment actions, and resolve/unresolve.
