# Differ Overview

## Purpose
This repository is a local-only diff review tool for monorepos. It pairs a FastAPI backend for comparing branches and commits in registered git repositories (with persistent line comments bound to the compared head commit) with a React + TypeScript SPA that consumes the API.

## Architecture
### Backend (`src/differ_api/`)
- API layer: FastAPI routers under `src/differ_api/api/routes` (`repos`, `sessions`, `comments`, `fs`)
- Service layer: orchestration and validation under `src/differ_api/services`
- Repository layer: SQLite persistence under `src/differ_api/repositories`
- Git adapter: local git execution and diff parsing under `src/differ_api/git`
- Database layer: SQLAlchemy models and session factory under `src/differ_api/domain` and `src/differ_api/db`

The app factory lives in `src/differ_api/app.py`. `create_app()` wires repositories, services, the git client, and the routers together. Tables are created automatically on startup for local development; Alembic is included for tracked schema evolution.

### Frontend (`frontend/`)
- Runtime: Bun `1.3+` with HTML imports and HMR. Entry is `frontend/index.ts`, which serves `index.html` and proxies `/api/*` to the FastAPI server.
- UI: React 19 + TypeScript 5.7, hash-based routing (`frontend/src/router.ts`) — no router library.
- Structure:
  - `src/views/` — `HomeView`, `RepoView`, `SessionView`
  - `src/components/` — diff primitives (`Article`, `Hunk`, `Line`, `MarginNote`), the `DirectoryPicker` modal, and literary chrome (`Masthead`, `Colophon`, `Frontispiece`)
  - `src/api.ts` — typed fetch client mirroring the API contract in this document
  - `src/types.ts` — shared DTOs
  - `src/styles.css` — "The Review" literary journal aesthetic (Fraunces / Newsreader / JetBrains Mono)
- Dev server: `bun run dev` on port `3500`. Override with `PORT=...` and `DIFFER_API=...` env vars.

## Design System

### Aesthetic Concept
The frontend is presented as **"The Review · A Journal of Code in Translation"** — a literary journal and old press-house metaphor applied to diff review. Repositories are "subscriptions," sessions are "proofs," comments are "marginalia," branches are "settings in type." The tone is editorial and restrained, not whimsical. Every surface should read as if it came off a letterpress.

This is not a neutral product UI. New components must commit to the metaphor: label copy belongs in the vocabulary of printing and editing (press room, shelves, catalogue, folio, colophon, pressmark, cartouche, ornament), not generic SaaS copy.

### Color Tokens (CSS variables, `src/styles.css`)
All colors are CSS custom properties on `:root`. Components must use the tokens, not hard-coded hex.

| Token           | Value     | Role                                              |
| --------------- | --------- | ------------------------------------------------- |
| `--paper`       | `#efe6d2` | Base page background (warm cream)                 |
| `--paper-2`     | `#e5d9bd` | Raised/nested surface (cards, modal heads)        |
| `--paper-3`     | `#d8c89f` | Deepest paper tone (hovers, subtle inset panels)  |
| `--ink`         | `#1a150c` | Primary text, primary button fill, hard rules     |
| `--ink-soft`    | `#3a2f1e` | Secondary body text                               |
| `--ink-faint`   | `#786544` | Tertiary text, dotted rules, disabled glyphs      |
| `--rule`        | `#1a150c` | Horizontal rules, borders                         |
| `--gold`        | `#a87324` | Accents: pressmarks, ornaments, breadcrumb seps   |
| `--vermilion`   | `#8b2a1f` | Proof-mark red: deletions, git-tree highlights, destructive hover |
| `--olive`       | `#4a5d2a` | Additions bar                                     |
| `--add-bg` / `--add-bar`     | `#d9dfbe` / `#4a5d2a` | Diff `+` line tint + gutter bar     |
| `--del-bg` / `--del-bar`     | `#e6cfc6` / `#8b2a1f` | Diff `-` line tint + gutter bar     |
| `--context-bg`  | `#ece2cb` | Diff context line tint                            |
| `--shadow`      | layered   | Standard elevation (hairline + long drop)         |

Dominant surface is paper; ink is the main contrast; gold and vermilion are **sparingly** applied accents. Never introduce new accent hues without adding a token.

### Typography
Three typefaces, loaded via Google Fonts in `index.html`. Do not add a fourth without reason.

- **Fraunces** (display + small caps) — variable font with `opsz`, `SOFT`, `WONK` axes. Use `font-variation-settings` to tune: e.g. `"opsz" 144, "SOFT" 20, "WONK" 1` for the masthead, `"opsz" 14, "SOFT" 50` for smallcaps. Headings and display numerals.
- **Newsreader** (body) — serif body and italic "literary" voice. Use `em.literary` for italicised phrases within body copy.
- **JetBrains Mono** — code, paths, commit SHAs, keyboard hints. Applied via `.mono`, `code`, `pre`, `kbd`.

Utility classes already defined:
- `.display` — masthead-scale Fraunces
- `.smallcaps` — uppercase Fraunces, 0.22em tracking, editorial labels
- `.serif-body` — Newsreader body reset
- `.mono` — JetBrains Mono
- `em.literary` — Newsreader italic within prose

### Texture and Atmosphere
The global page treatment is non-negotiable — it is the primary "expensive" detail that signals the aesthetic.

- `body::before` — SVG fractal-noise letterpress grain, `mix-blend-mode: multiply`, full-viewport, non-interactive.
- `body::after` — 1px horizontal scanline pattern at ~2% ink opacity, also `multiply`.
- Both layers sit at `z-index: 100/101` with `pointer-events: none`. Any full-screen overlay (modals, toasts) must render **above** these with its own stacking context if it needs to be clean of texture, or below them to inherit the grain.

### Motion
- Page entries use a `settle` keyframe (8px rise + fade, 700ms ease) staggered via `animate > *:nth-child(n)` delays.
- Prefer CSS-only transitions for hover and cursor states.
- Never chain more than two concurrent animations on a surface — the grain is already doing visual work.

### Component Vocabulary
When extending the UI, reach for these existing primitives before inventing new ones:

- `Masthead` — top banner with pressmark and title
- `Frontispiece` — hero/intro slab
- `Colophon` — footer colophon
- `Pressmark` — gold ornamental mark used as a decorative anchor
- `Banner` — inline notice (`tone="err"` vermilion, default ink)
- `Article`, `Hunk`, `Line`, `MarginNote` — diff rendering stack
- `Toolbar`, `Toc`, `StatsBoard` — session chrome
- `DirectoryPicker` — modal filesystem browser (git-tree rows styled with vermilion accent bar + roman-numeral index)
- `Floater`, `NewNote`, `Loading` — contextual UI

Shared CSS classes worth knowing: `.page`, `.card`, `.meta-bar`, `.toc-header`, `.catalogue`, `.empty-state`, `.btn` / `.btn.primary`, `.form-row`, `.path-field`, `.modal` / `.modal.picker`, `.breadcrumb`, `.section-head`, `.dir-row`, `.kbd-hint`, `.orn`, `.ornament`.

### Rules of Thumb
- Labels and headings should sound like table-of-contents entries, not form fields ("Registered Repositories" not "Your Repos", "Press Room · The subscribers' index" not "Dashboard").
- Use italicised Newsreader via `em.literary` for emphasis inside headings and copy — not bold.
- Use `✦`, `❧`, `⁂`, `◆`, `§`, `¶` as punctuation-weight ornaments; do not use emoji.
- Use roman numerals (`src/util.ts → romanize`) for curated or "catalogue" lists where the order is meaningful.
- Keep paper surfaces warm; never introduce pure white. Keep ink warm-black (`--ink`), never pure `#000`.
- Gold is for marks and seals. Vermilion is for corrections, deletions, and emphasis — treat it like a proofreader's red pen.
- Monospace for any machine-produced string: absolute paths, refs, SHAs, keyboard keys.

## Core Entities
### Repo
- Registered once through `POST /repos`
- Stores a local absolute filesystem path and a display name derived from the directory name
- Must point at an existing git working tree

### Session
- Created through `POST /sessions`
- Belongs to exactly one registered repo
- Stores a default `base_ref` and optional `head_ref`
- Stores optional `path_filters` as repo-relative path prefixes for monorepo scoping
- `base_ref` defaults to `main`
- Can be archived through `POST /sessions/{session_id}/archive`
- Archived sessions are readable and comparable, but write endpoints reject changes with `409` and `Archived sessions are read-only`

### Comment
- Created through `POST /sessions/{session_id}/comments`
- Bound to `session_id`, `head_commit_sha`, `file_path`, `line_side`, and `line_number`
- May optionally store `base_commit_sha` from the comparison where it was created
- Status is `open` or `resolved`
- Comments are surfaced again when the same `head_commit_sha` is compared in the same session

## Endpoint Contract
### Repositories
- `POST /repos`
  - Request: `{ "path": "/absolute/path/to/repo" }`
  - Response: repo object with `id`, `name`, `path`, and timestamps
- `GET /repos`
  - Response: `{ "items": [Repo...] }`
- `GET /repos/{repo_id}`
  - Response: single repo object

### Sessions
- `POST /sessions`
  - Request:
    ```json
    {
      "repo_id": "uuid",
      "base_ref": "main",
      "head_ref": "feature/diff-comments",
      "path_filters": ["packages/pkg-a", "apps/web"]
    }
    ```
  - `head_ref` is optional at creation time, but a compare call still needs a head ref or head commit
- `GET /sessions`
  - Response: `{ "items": [Session...] }`
- `GET /sessions/{session_id}`
  - Response: single session object
- `POST /sessions/{session_id}/archive`
  - Response: session object with `status: "archived"`

### Compare
- `POST /sessions/{session_id}/compare`
- Request body can override any stored defaults:
  ```json
  {
    "base_ref": "main",
    "head_ref": "feature/diff-comments",
    "base_commit": "abc123",
    "head_commit": "def456",
    "path_filters": ["packages/pkg-a"]
  }
  ```
- Supported modes:
  - branch vs branch
  - branch vs commit
  - commit vs commit
- If both a ref and commit are provided on one side, the commit must be reachable from that ref or the API returns `422` with `Commit is not reachable from the provided ref`

### Comments
- `POST /sessions/{session_id}/comments`
  - Request:
    ```json
    {
      "head_commit_sha": "def456",
      "base_commit_sha": "abc123",
      "file_path": "packages/pkg-a/service.py",
      "line_side": "new",
      "line_number": 2,
      "body": "Consider making this greeting configurable."
    }
    ```
- `GET /sessions/{session_id}/comments`
  - Optional query parameters: `head_commit_sha`, `file_path`, `status`
- `PATCH /comments/{comment_id}`
  - Allows updating `body`, `file_path`, `line_side`, or `line_number`
  - Only open comments are editable
- `POST /comments/{comment_id}/resolve`
- `POST /comments/{comment_id}/reopen`

### Filesystem (for the directory picker)
- `GET /fs/browse`
  - Query parameters:
    - `path` (optional) — absolute path to list. Defaults to the user's home directory.
    - `show_hidden` (optional, boolean) — include dotfiles/dotdirs. Defaults to `false`.
  - Response:
    ```json
    {
      "path": "/Users/you",
      "parent": "/Users",
      "is_git": false,
      "entries": [
        { "name": "Code", "path": "/Users/you/Code", "is_git": false },
        { "name": "differ", "path": "/Users/you/Code/differ", "is_git": true }
      ]
    }
    ```
  - `is_git` on an entry means the directory contains a `.git` entry (file or dir) and can be passed straight to `POST /repos`.

## Diff Response Shape
`POST /sessions/{session_id}/compare` returns:

```json
{
  "base": {
    "ref": "main",
    "commit": "abc123",
    "author_name": "Test User",
    "author_email": "test@example.com",
    "authored_at": "2026-04-16T12:00:00Z",
    "subject": "Add package version"
  },
  "head": {
    "ref": "feature/diff-comments",
    "commit": "def456",
    "author_name": "Test User",
    "author_email": "test@example.com",
    "authored_at": "2026-04-16T12:05:00Z",
    "subject": "Feature updates package and app"
  },
  "stats": {
    "files_changed": 2,
    "additions": 3,
    "deletions": 2
  },
  "files": [
    {
      "old_path": "packages/pkg-a/service.py",
      "new_path": "packages/pkg-a/service.py",
      "change_type": "modified",
      "additions": 2,
      "deletions": 2,
      "hunks": [
        {
          "old_start": 1,
          "old_lines": 5,
          "new_start": 1,
          "new_lines": 5,
          "header": "",
          "lines": [
            {
              "kind": "context",
              "content": "def greet():",
              "old_line": 1,
              "new_line": 1
            },
            {
              "kind": "delete",
              "content": "    return 'hello from main'",
              "old_line": 2,
              "new_line": null
            },
            {
              "kind": "add",
              "content": "    return 'hello from feature'",
              "old_line": null,
              "new_line": 2
            }
          ]
        }
      ]
    }
  ],
  "comments": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "head_commit_sha": "def456",
      "base_commit_sha": "abc123",
      "file_path": "packages/pkg-a/service.py",
      "line_side": "new",
      "line_number": 2,
      "body": "Consider making this greeting configurable.",
      "status": "open",
      "created_at": "2026-04-16T12:06:00Z",
      "updated_at": "2026-04-16T12:06:00Z"
    }
  ]
}
```

## Frontend Mapping Notes
- Render inline comments by matching `comment.file_path` and:
  - `line_side == "new"` against a diff line with matching `new_line`
  - `line_side == "old"` against a diff line with matching `old_line`
- The `comments` array in a compare response is already filtered to the resolved head commit for that session
- `path_filters` are prefix-based, not glob-based
- `change_type` values are currently `added`, `deleted`, `modified`, or `renamed`

## Validation and Errors
- `422`
  - path is not a git repository
  - invalid path filter
  - invalid line side
  - invalid line number
  - commit is not reachable from the provided ref
- `404`
  - repo, session, or comment not found
- `409`
  - archived session write attempt
  - edit attempt on a resolved comment
- `400`
  - missing required comparison side after defaults are applied

## Local Development
### Backend
1. Create a virtual environment (`python -m venv .venv && source .venv/bin/activate`).
2. Install dependencies with `pip install -e '.[dev]'`.
3. Run the API with `uvicorn differ_api.app:app --reload` (defaults to `http://127.0.0.1:8000`).
4. Run tests with `pytest`.
5. Use Alembic for tracked schema changes (`alembic revision --autogenerate -m "..."`, `alembic upgrade head`).

### Frontend
1. `cd frontend`
2. Install dependencies with `bun install`.
3. Run the dev server with `bun run dev` (defaults to `http://localhost:3500`, HMR enabled).
4. Typecheck with `./node_modules/.bin/tsc --noEmit`.

The frontend proxies `/api/*` to `http://127.0.0.1:8000`. Override via `DIFFER_API=http://host:port` and port via `PORT=...`. Both servers must be running for the UI to work end-to-end.

See `README.md` for user-facing quickstart.

## Testing Strategy
- Tests use real temporary git repositories instead of mocking git history
- SQLite is created per test run in a temporary file
- API coverage includes repo registration, session lifecycle, comparisons, comment lifecycle, archive rules, and a workflow smoke test
- `tests/test_workflow.py` also checks that this document stays aligned with the implemented API surface
- Frontend is currently covered by typechecking (`tsc --noEmit`); no runtime test suite yet

## Out of Scope in v1
- Authentication and multi-user identity
- Nested comment threads or replies
- Raw patch text in the public API
- Cross-repo sessions
- Remote clone management
- Frontend runtime test suite (typecheck only)
