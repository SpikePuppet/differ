export interface Migration {
  name: string
  sql: string
}

export const migrations: Migration[] = [
  {
    name: '0001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS repos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        base_ref TEXT NOT NULL,
        head_ref TEXT,
        path_filters_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_repo_id ON sessions(repo_id);

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        head_commit_sha TEXT NOT NULL,
        base_commit_sha TEXT,
        file_path TEXT NOT NULL,
        line_side TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_comments_session_id ON comments(session_id);
      CREATE INDEX IF NOT EXISTS idx_comments_head_commit_sha ON comments(head_commit_sha);

      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `,
  },
  {
    name: '0002_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    name: '0003_ai_summaries',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        head_commit_sha TEXT NOT NULL,
        model TEXT NOT NULL,
        overall_summary TEXT,
        file_summaries_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(session_id, head_commit_sha)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_summaries_session ON ai_summaries(session_id);
    `,
  },
]
