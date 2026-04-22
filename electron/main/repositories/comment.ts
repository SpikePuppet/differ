import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { CommentRow } from '../db/types'

export class CommentRepository {
  constructor(private db: Database.Database) {}

  create(data: {
    session_id: string
    head_commit_sha: string
    base_commit_sha: string | null
    file_path: string
    line_side: string
    line_number: number
    body: string
  }): CommentRow {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        'INSERT INTO comments (id, session_id, head_commit_sha, base_commit_sha, file_path, line_side, line_number, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.session_id,
        data.head_commit_sha,
        data.base_commit_sha,
        data.file_path,
        data.line_side,
        data.line_number,
        data.body,
        'open',
        now,
        now
      )
    return this.getById(id)!
  }

  getById(id: string): CommentRow | undefined {
    return this.db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as
      | CommentRow
      | undefined
  }

  list(filters: {
    session_id: string
    head_commit_sha?: string
    file_path?: string
    status?: string
  }): CommentRow[] {
    let sql = 'SELECT * FROM comments WHERE session_id = ?'
    const params: (string | number)[] = [filters.session_id]

    if (filters.head_commit_sha) {
      sql += ' AND head_commit_sha = ?'
      params.push(filters.head_commit_sha)
    }
    if (filters.file_path) {
      sql += ' AND file_path = ?'
      params.push(filters.file_path)
    }
    if (filters.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }

    sql += ' ORDER BY created_at'
    return this.db.prepare(sql).all(...params) as CommentRow[]
  }

  update(
    id: string,
    fields: {
      body?: string
      file_path?: string
      line_side?: string
      line_number?: number
      status?: string
    }
  ): CommentRow | undefined {
    const sets: string[] = []
    const params: (string | number)[] = []

    if (fields.body !== undefined) {
      sets.push('body = ?')
      params.push(fields.body)
    }
    if (fields.file_path !== undefined) {
      sets.push('file_path = ?')
      params.push(fields.file_path)
    }
    if (fields.line_side !== undefined) {
      sets.push('line_side = ?')
      params.push(fields.line_side)
    }
    if (fields.line_number !== undefined) {
      sets.push('line_number = ?')
      params.push(fields.line_number)
    }
    if (fields.status !== undefined) {
      sets.push('status = ?')
      params.push(fields.status)
    }

    if (sets.length === 0) return this.getById(id)

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const sql = `UPDATE comments SET ${sets.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...params)
    return this.getById(id)
  }
}
