# Differ · The Review

A local-only diff review tool for monorepos. Register a git working tree, open a session, compare refs or commits, leave persistent line comments. Nothing leaves your machine.

- **Backend** — FastAPI + SQLAlchemy + SQLite, in `src/differ_api/`
- **Frontend** — React 19 + TypeScript, served by Bun, in `frontend/`

## Prerequisites

- Python **3.12+**
- [Bun](https://bun.sh) **1.3+**
- Git on `PATH`

## One-time setup

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

# Frontend
cd frontend
bun install
cd ..
```

## Running it

You need two processes. Open two terminals from the project root.

**Terminal 1 — API** (port 8000):

```bash
source .venv/bin/activate
uvicorn differ_api.app:app --reload
```

**Terminal 2 — Frontend** (port 3500):

```bash
cd frontend
bun run dev
```

Then open http://localhost:3500.

The frontend proxies `/api/*` to `http://127.0.0.1:8000`. Override with `DIFFER_API=http://host:port bun run dev` or change the port with `PORT=4000 bun run dev`.

## Using it

1. **Register a repository** on the home page. Enter an absolute path or click **Browse** to pick a git working tree from your filesystem.
2. **Open the repository** and create a **session** with a base ref (defaults to `main`), an optional head ref, and optional path filters for monorepo scoping.
3. **Compare** — the session view renders a full diff with file-level stats, hunks, and inline marginalia.
4. **Comment** by clicking a line gutter. Comments are bound to the head commit SHA and resurface when the same commit is compared again. Resolve or reopen from the margin.

Archived sessions remain readable and comparable but reject writes.

## Testing

```bash
# Backend
pytest

# Frontend typecheck
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Backend tests spin up real temporary git repos — no git mocking. SQLite is created per run in a temp file.

## Schema changes

Tables auto-create on startup for local development. For tracked migrations:

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Project layout

```
differ/
├── src/differ_api/       # FastAPI app
│   ├── api/routes/       # routers: repos, sessions, comments, fs
│   ├── services/         # orchestration + validation
│   ├── repositories/     # SQLite persistence
│   ├── git/              # local git execution + diff parsing
│   ├── domain/           # SQLAlchemy models
│   └── db/               # session factory
├── alembic/              # migrations
├── tests/                # pytest suite
├── frontend/
│   ├── index.ts          # Bun server + /api/* proxy
│   ├── index.html        # HTML entry (imports React)
│   └── src/
│       ├── views/        # HomeView, RepoView, SessionView
│       ├── components/   # Article, Hunk, Line, MarginNote, DirectoryPicker, ...
│       ├── api.ts        # typed fetch client
│       ├── types.ts      # shared DTOs
│       ├── router.ts     # hash-based routing
│       └── styles.css    # literary journal aesthetic
└── AGENTS.md             # API contract + architecture notes
```

See `AGENTS.md` for the full API contract, endpoint shapes, and validation rules.

## Scope

In scope: single-user, local-only review of local git repos.

Out of scope (v1): authentication, comment threads/replies, raw patch text in the public API, cross-repo sessions, remote clone management.
