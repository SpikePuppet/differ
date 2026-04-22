import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { SessionRow } from '../db/types'

type EnrichedSessionRow = SessionRow & { path_filters: string[] }

function enrich(row: SessionRow | undefined): EnrichedSessionRow | undefined {
  if (!row) return undefined
  return {
    ...row,
    path_filters: JSON.parse(row.path_filters_json),
  }
}

function enrichAll(rows: SessionRow[]): EnrichedSessionRow[] {
  return rows.map((r) => enrich(r)!)
}

export class SessionRepository {
  constructor(private db: Database.Database) {}

  create(data: {
    repo_id: string
    base_ref: string
    head_ref: string | null
    path_filters: string[]
  }): EnrichedSessionRow {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        'INSERT INTO sessions (id, repo_id, base_ref, head_ref, path_filters_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.repo_id,
        data.base_ref,
        data.head_ref,
        JSON.stringify(data.path_filters),
        'active',
        now,
        now
      )
    return this.getById(id)!
  }

  getById(id: string): EnrichedSessionRow | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      | SessionRow
      | undefined
    return enrich(row)
  }

  list(): EnrichedSessionRow[] {
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY created_at').all() as SessionRow[]
    return enrichAll(rows)
  }

  archive(id: string): EnrichedSessionRow | undefined {
    const now = new Date().toISOString()
    const result = this.db
      .prepare(
        "UPDATE sessions SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND status != 'archived'"
      )
      .run(now, now, id)
    if (result.changes === 0) {
      // Either already archived or doesn't exist
      return this.getById(id)
    }
    return this.getById(id)
  }
}
