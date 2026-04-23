import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { AiSummaryRow } from '../db/types'

export class AiRepository {
  constructor(private db: Database.Database) {}

  getBySessionAndCommit(sessionId: string, headCommitSha: string): AiSummaryRow | undefined {
    return this.db
      .prepare('SELECT * FROM ai_summaries WHERE session_id = ? AND head_commit_sha = ?')
      .get(sessionId, headCommitSha) as AiSummaryRow | undefined
  }

  create(data: {
    session_id: string
    head_commit_sha: string
    model: string
    overall_summary: string | null
    file_summaries_json: string
  }): AiSummaryRow {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        'INSERT INTO ai_summaries (id, session_id, head_commit_sha, model, overall_summary, file_summaries_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, data.session_id, data.head_commit_sha, data.model, data.overall_summary, data.file_summaries_json, now)
    return this.getById(id)!
  }

  private getById(id: string): AiSummaryRow | undefined {
    return this.db.prepare('SELECT * FROM ai_summaries WHERE id = ?').get(id) as AiSummaryRow | undefined
  }
}
