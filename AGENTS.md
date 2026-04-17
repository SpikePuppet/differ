# Differ Backend Overview

## Purpose
This repository contains a local-only FastAPI backend for comparing branches and commits in registered git repositories, then attaching persistent line comments to the compared head commit. It is intended to back a frontend diff review tool for monorepos.

## Architecture
- API layer: FastAPI routers under `src/differ_api/api/routes`
- Service layer: orchestration and validation under `src/differ_api/services`
- Repository layer: SQLite persistence under `src/differ_api/repositories`
- Git adapter: local git execution and diff parsing under `src/differ_api/git`
- Database layer: SQLAlchemy models and session factory under `src/differ_api/domain` and `src/differ_api/db`

The app factory lives in `src/differ_api/app.py`. `create_app()` wires repositories, services, the git client, and the routers together. Tables are created automatically on startup for local development; Alembic is included for tracked schema evolution.

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
1. Create a virtual environment.
2. Install dependencies with `pip install -e '.[dev]'`.
3. Run the API with `uvicorn differ_api.app:app --reload`.
4. Run tests with `pytest`.
5. Use Alembic for future schema changes with `alembic upgrade head`.

## Testing Strategy
- Tests use real temporary git repositories instead of mocking git history
- SQLite is created per test run in a temporary file
- API coverage includes repo registration, session lifecycle, comparisons, comment lifecycle, archive rules, and a workflow smoke test
- `tests/test_workflow.py` also checks that this document stays aligned with the implemented API surface

## Out of Scope in v1
- Authentication and multi-user identity
- Nested comment threads or replies
- Raw patch text in the public API
- Cross-repo sessions
- Remote clone management
