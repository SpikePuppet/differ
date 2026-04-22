import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'

function makeDb(): { dbPath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'differ-db-test-'))
  const dbPath = join(dir, 'test.db')
  return {
    dbPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

// We'll import the actual module once it exists
async function createDatabase(dbPath: string) {
  const { createDatabase } = await import('../../electron/main/db/index')
  return createDatabase(dbPath)
}

describe('database migrations', () => {
  it('creates tables on first open', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db = await createDatabase(dbPath)
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        .all() as Array<{ name: string }>
      const names = tables.map((t) => t.name)
      expect(names).toContain('repos')
      expect(names).toContain('sessions')
      expect(names).toContain('comments')
      expect(names).toContain('_migrations')
    } finally {
      cleanup()
    }
  })

  it('does not re-run applied migrations', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db1 = await createDatabase(dbPath)
      const count1 = db1
        .prepare('SELECT COUNT(*) as c FROM _migrations')
        .get() as { c: number }
      expect(count1.c).toBeGreaterThan(0)

      const db2 = await createDatabase(dbPath)
      const count2 = db2
        .prepare('SELECT COUNT(*) as c FROM _migrations')
        .get() as { c: number }
      expect(count2.c).toBe(count1.c)
    } finally {
      cleanup()
    }
  })
})

describe('repo CRUD', () => {
  it('round-trips a repo', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db = await createDatabase(dbPath)
      const insert = db.prepare(
        'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      const now = new Date().toISOString()
      insert.run('repo-1', 'test-repo', '/path/to/repo', now, now)

      const row = db
        .prepare('SELECT * FROM repos WHERE id = ?')
        .get('repo-1') as { id: string; name: string; path: string }
      expect(row.name).toBe('test-repo')
      expect(row.path).toBe('/path/to/repo')
    } finally {
      cleanup()
    }
  })

  it('enforces unique path constraint', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db = await createDatabase(dbPath)
      const insert = db.prepare(
        'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      const now = new Date().toISOString()
      insert.run('repo-1', 'a', '/same/path', now, now)
      expect(() =>
        insert.run('repo-2', 'b', '/same/path', now, now)
      ).toThrow(/UNIQUE constraint failed/)
    } finally {
      cleanup()
    }
  })
})

describe('session CRUD', () => {
  it('round-trips a session with path_filters_json', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db = await createDatabase(dbPath)
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run('repo-1', 'test', '/path', now, now)

      db.prepare(
        'INSERT INTO sessions (id, repo_id, base_ref, head_ref, path_filters_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run('sess-1', 'repo-1', 'main', 'feature', '["pkg-a"]', 'active', now, now)

      const row = db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .get('sess-1') as { repo_id: string; base_ref: string; path_filters_json: string; status: string }
      expect(row.repo_id).toBe('repo-1')
      expect(row.base_ref).toBe('main')
      expect(row.path_filters_json).toBe('["pkg-a"]')
      expect(row.status).toBe('active')
    } finally {
      cleanup()
    }
  })
})

describe('comment CRUD', () => {
  it('round-trips a comment', async () => {
    const { dbPath, cleanup } = makeDb()
    try {
      const db = await createDatabase(dbPath)
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run('repo-1', 'test', '/path', now, now)

      db.prepare(
        'INSERT INTO sessions (id, repo_id, base_ref, head_ref, path_filters_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run('sess-1', 'repo-1', 'main', null, '[]', 'active', now, now)

      db.prepare(
        'INSERT INTO comments (id, session_id, head_commit_sha, base_commit_sha, file_path, line_side, line_number, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run('comm-1', 'sess-1', 'abc123', 'def456', 'a.py', 'new', 2, 'hello', 'open', now, now)

      const row = db
        .prepare('SELECT * FROM comments WHERE id = ?')
        .get('comm-1') as { session_id: string; line_side: string; line_number: number; body: string; status: string }
      expect(row.session_id).toBe('sess-1')
      expect(row.line_side).toBe('new')
      expect(row.line_number).toBe(2)
      expect(row.body).toBe('hello')
      expect(row.status).toBe('open')
    } finally {
      cleanup()
    }
  })
})
