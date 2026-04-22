import Database from 'better-sqlite3'
import { migrations } from './migrations'

export { migrations }

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  const tableExists = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='_migrations'"
    )
    .get()

  const applied = new Set<string>()
  if (tableExists) {
    const rows = db
      .prepare('SELECT name FROM _migrations ORDER BY name')
      .all() as Array<{ name: string }>
    for (const r of rows) applied.add(r.name)
  }

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue

    db.exec(migration.sql)
    db.prepare(
      'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)'
    ).run(migration.name, new Date().toISOString())
  }
}
