import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createDatabase } from '../../electron/main/db/index'
import {
  executeCommand,
  parseArgs,
  resolveDbPath,
  validateSelectQuery,
} from '../../scripts/db-inspect'

function makeDb(): { dbPath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'differ-db-inspect-'))
  const dbPath = join(dir, 'test.db')
  return {
    dbPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

describe('db inspector path resolution', () => {
  it('prefers an explicit --db override', () => {
    const resolved = resolveDbPath({ dbPathArg: '/tmp/custom.db' })
    expect(resolved).toBe('/tmp/custom.db')
  })

  it('resolves a platform default path when no override is provided', () => {
    const resolved = resolveDbPath({ platform: 'darwin', homeDir: '/Users/tester' })
    expect(resolved).toBe('/Users/tester/Library/Application Support/Differ/differ.db')
  })

  it('rejects a missing database path', () => {
    expect(() =>
      resolveDbPath({ dbPathArg: '/tmp/missing.db', existsSync: () => false, mustExist: true })
    ).toThrow('Database file not found')
  })
})

describe('db inspector cli parsing', () => {
  it('parses rows with a limit and db override', () => {
    expect(parseArgs(['rows', 'sessions', '--limit', '5', '--db', '/tmp/a.db'])).toEqual({
      command: 'rows',
      table: 'sessions',
      limit: 5,
      dbPathArg: '/tmp/a.db',
    })
  })

  it('parses a query command', () => {
    expect(parseArgs(['query', 'SELECT id FROM sessions'])).toEqual({
      command: 'query',
      sql: 'SELECT id FROM sessions',
    })
  })
})

describe('db inspector query validation', () => {
  it('accepts a simple select query', () => {
    expect(() => validateSelectQuery('SELECT id FROM sessions')).not.toThrow()
  })

  it('rejects mutating sql', () => {
    expect(() => validateSelectQuery('DELETE FROM sessions')).toThrow('Only SELECT queries are allowed')
  })

  it('rejects multiple statements', () => {
    expect(() => validateSelectQuery('SELECT 1; SELECT 2')).toThrow('Multiple SQL statements are not allowed')
  })
})

describe('db inspector commands', () => {
  let dbPath: string
  let cleanup: () => void

  beforeEach(() => {
    const fixture = makeDb()
    dbPath = fixture.dbPath
    cleanup = fixture.cleanup

    const db = createDatabase(dbPath)
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('repo-1', 'alpha', '/tmp/alpha', now, now)
    db.prepare(
      'INSERT INTO sessions (id, repo_id, base_ref, head_ref, path_filters_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('sess-1', 'repo-1', 'main', 'feature', '["packages/pkg-a"]', 'active', now, now)
    db.prepare(
      'INSERT INTO comments (id, session_id, head_commit_sha, base_commit_sha, file_path, line_side, line_number, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('comment-1', 'sess-1', 'abc123', 'def456', 'packages/pkg-a/service.py', 'new', 2, 'hello', 'open', now, now)
    db.prepare(
      'INSERT INTO ai_summaries (id, session_id, head_commit_sha, provider, model, overall_summary, file_summaries_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('ai-1', 'sess-1', 'abc123', 'openai', 'gpt-4o', 'summary', '{"packages/pkg-a/service.py":"changed"}', now)
    db.close()
  })

  afterEach(() => {
    cleanup()
  })

  it('lists tables from the migrated database', () => {
    const output = executeCommand(dbPath, { command: 'tables' })
    expect(output).toContain('repos')
    expect(output).toContain('sessions')
    expect(output).toContain('comments')
    expect(output).toContain('settings')
    expect(output).toContain('ai_summaries')
  })

  it('shows a table schema', () => {
    const output = executeCommand(dbPath, { command: 'schema', table: 'sessions' })
    expect(output).toContain('base_ref')
    expect(output).toContain('path_filters_json')
    expect(output).toContain('archived_at')
  })

  it('shows row counts for a table', () => {
    const output = executeCommand(dbPath, { command: 'count', table: 'comments' })
    expect(output).toContain('comments')
    expect(output).toContain('1')
  })

  it('shows row previews and formats json-backed columns readably', () => {
    const output = executeCommand(dbPath, { command: 'rows', table: 'sessions', limit: 5 })
    expect(output).toContain('packages/pkg-a')
    expect(output).not.toContain('["packages/pkg-a"]')
  })

  it('runs a select query', () => {
    const output = executeCommand(dbPath, {
      command: 'query',
      sql: 'SELECT id, status FROM sessions ORDER BY created_at DESC',
    })
    expect(output).toContain('sess-1')
    expect(output).toContain('active')
  })
})
