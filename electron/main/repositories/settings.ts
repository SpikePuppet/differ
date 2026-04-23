import Database from 'better-sqlite3'
import type { SettingsRow } from '../db/types'

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  get(key: string): SettingsRow | undefined {
    return this.db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
  }

  set(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value)
  }
}
