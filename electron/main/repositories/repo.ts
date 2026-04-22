import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { RepoRow } from '../db/types'

export class RepoRepository {
  constructor(private db: Database.Database) {}

  create(name: string, path: string): RepoRow {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        'INSERT INTO repos (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, name, path, now, now)
    return this.getById(id)!
  }

  getById(id: string): RepoRow | undefined {
    return this.db.prepare('SELECT * FROM repos WHERE id = ?').get(id) as RepoRow | undefined
  }

  getByPath(path: string): RepoRow | undefined {
    return this.db.prepare('SELECT * FROM repos WHERE path = ?').get(path) as RepoRow | undefined
  }

  list(): RepoRow[] {
    return this.db.prepare('SELECT * FROM repos ORDER BY created_at').all() as RepoRow[]
  }
}
