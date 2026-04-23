export interface Repo {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  repo_id: string;
  base_ref: string;
  head_ref: string | null;
  path_filters: string[];
  status: "active" | "archived" | string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitSummary {
  ref: string | null;
  commit: string;
  author_name: string;
  author_email: string;
  authored_at: string;
  subject: string;
}

export interface DiffStats {
  files_changed: number;
  additions: number;
  deletions: number;
}

export type LineKind = "context" | "add" | "delete";

export interface DiffLine {
  kind: LineKind;
  content: string;
  old_line: number | null;
  new_line: number | null;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export type ChangeType = "added" | "deleted" | "modified" | "renamed";

export interface DiffFile {
  old_path: string;
  new_path: string;
  change_type: ChangeType | string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export type LineSide = "old" | "new";
export type CommentStatus = "open" | "resolved";

export interface Comment {
  id: string;
  session_id: string;
  head_commit_sha: string;
  base_commit_sha: string | null;
  file_path: string;
  line_side: LineSide;
  line_number: number;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
}

export interface DiffResponse {
  base: CommitSummary;
  head: CommitSummary;
  stats: DiffStats;
  files: DiffFile[];
  comments: Comment[];
}

export interface CompareOverrides {
  base_ref?: string;
  head_ref?: string;
  base_commit?: string;
  head_commit?: string;
  path_filters?: string[];
}

export interface SessionCreateRequest {
  repo_id: string;
  base_ref?: string;
  head_ref?: string | null;
  path_filters?: string[];
}

export interface CommentCreateRequest {
  head_commit_sha: string;
  base_commit_sha?: string | null;
  file_path: string;
  line_side: LineSide;
  line_number: number;
  body: string;
}

export interface CommentUpdateRequest {
  body?: string;
  file_path?: string;
  line_side?: LineSide;
  line_number?: number;
}

export interface FsEntry {
  name: string;
  path: string;
  is_git: boolean;
}

export interface FsBrowseResponse {
  path: string;
  parent: string | null;
  is_git: boolean;
  entries: FsEntry[];
}

export interface AiSummary {
  overall: string | null;
  files: Record<string, string>;
}
