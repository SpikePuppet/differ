# Differ

A local-only diff review tool. Point it at a git working tree, compare two refs, and leave persistent line comments. Nothing leaves your machine.

## Prerequisites

- [Node.js](https://nodejs.org) **18+** and npm
- Git on `PATH`

## Setup

```bash
npm install
```

Native dependencies (better-sqlite3) are rebuilt automatically via the `postinstall` script.

## Running in development

```bash
npm run dev
```

Opens the Electron app with hot reload. DevTools open automatically.

## Building a distributable

```bash
npm run dist
```

Produces a signed `.dmg` and `.zip` in `dist/`. On macOS this builds for `arm64` by default.

## Usage

1. **Add a repository** — enter an absolute path to a local git working tree, or click **Browse** to pick one from the filesystem.
2. **Start a comparison** — from the repository page, set a base ref (defaults to `main`), an optional head ref, and optional path filters for scoping to a subdirectory or package.
3. **Review the diff** — the session view shows a full diff with per-file stats, change hunks, and inline comments in the margin.
4. **Comment** — click any line to open a comment form. Comments are tied to the head commit SHA and reappear whenever that commit is compared.
5. **Resolve or archive** — resolve comments from the margin, or archive a session to make it read-only.

## Project layout

```
differ/
├── electron/
│   ├── main/             # main process (IPC, services, SQLite, git)
│   └── preload/          # context bridge
├── frontend/
│   └── src/
│       ├── views/        # HomeView, RepoView, SessionView
│       ├── components/   # Article, Hunk, MarginNote, BranchPicker, …
│       ├── api.ts        # IPC client
│       ├── types.ts      # shared types
│       └── styles.css
└── build/                # icon assets for packaging
```

## Testing

```bash
npm test
```
