export interface RepoRow {
  id: string
  name: string
  path: string
  created_at: string
  updated_at: string
}

export interface SessionRow {
  id: string
  repo_id: string
  base_ref: string
  head_ref: string | null
  path_filters_json: string
  status: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface CommentRow {
  id: string
  session_id: string
  head_commit_sha: string
  base_commit_sha: string | null
  file_path: string
  line_side: string
  line_number: number
  body: string
  status: string
  created_at: string
  updated_at: string
}

export interface SettingsRow {
  key: string
  value: string
}

export interface AiSummaryRow {
  id: string
  session_id: string
  head_commit_sha: string
  model: string
  overall_summary: string | null
  file_summaries_json: string
  created_at: string
}
