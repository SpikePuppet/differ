import { RepoRepository } from '../repositories/repo'
import { SessionRepository } from '../repositories/session'
import { CommentRepository } from '../repositories/comment'
import { GitClient } from '../git/client'
import { NotFoundError, BadRequestError } from './errors'
import { validatePathFilters } from './validators'
import type { CommentRow } from '../db/types'

export interface DiffResponse {
  base: {
    ref: string | null
    commit: string
    author_name: string
    author_email: string
    authored_at: string
    subject: string
  }
  head: {
    ref: string | null
    commit: string
    author_name: string
    author_email: string
    authored_at: string
    subject: string
  }
  stats: {
    files_changed: number
    additions: number
    deletions: number
  }
  files: import('../git/adapter').DiffFile[]
  comments: CommentRow[]
}

export class DiffService {
  constructor(
    private repoRepo: RepoRepository,
    private sessionRepo: SessionRepository,
    private commentRepo: CommentRepository,
    private gitClient: GitClient
  ) {}

  async compare(data: {
    session_id: string
    base_ref?: string | null
    head_ref?: string | null
    base_commit?: string | null
    head_commit?: string | null
    path_filters?: string[] | null
  }): Promise<DiffResponse> {
    const session = this.sessionRepo.getById(data.session_id)
    if (!session) throw new NotFoundError('Session not found')

    const repo = this.repoRepo.getById(session.repo_id)
    if (!repo) throw new NotFoundError('Repository not found')

    const effectiveBaseRef = data.base_ref ?? session.base_ref
    const effectiveHeadRef = data.head_ref ?? session.head_ref
    const effectiveFilters = validatePathFilters(
      data.path_filters !== undefined && data.path_filters !== null
        ? data.path_filters
        : JSON.parse(session.path_filters_json)
    )

    if (!effectiveBaseRef && !data.base_commit) {
      throw new BadRequestError('A base ref or base commit is required')
    }
    if (!effectiveHeadRef && !data.head_commit) {
      throw new BadRequestError('A head ref or head commit is required')
    }

    if (effectiveBaseRef) {
      await this.gitClient.ensureRefExists(repo.path, effectiveBaseRef)
    }
    if (effectiveHeadRef) {
      await this.gitClient.ensureRefExists(repo.path, effectiveHeadRef)
    }

    const resolvedBaseCommit = await this.gitClient.resolveRevision(repo.path, {
      ref: effectiveBaseRef,
      commit: data.base_commit ?? null,
    })
    const resolvedHeadCommit = await this.gitClient.resolveRevision(repo.path, {
      ref: effectiveHeadRef,
      commit: data.head_commit ?? null,
    })

    const diff = await this.gitClient.diff(repo.path, {
      baseCommit: resolvedBaseCommit,
      headCommit: resolvedHeadCommit,
      pathFilters: effectiveFilters,
    })

    const comments = this.commentRepo.list({
      session_id: data.session_id,
      head_commit_sha: resolvedHeadCommit,
    })

    const [baseSummary, headSummary] = await Promise.all([
      this.gitClient.getCommitSummary(repo.path, resolvedBaseCommit, effectiveBaseRef ?? null),
      this.gitClient.getCommitSummary(repo.path, resolvedHeadCommit, effectiveHeadRef ?? null),
    ])

    return {
      base: baseSummary,
      head: headSummary,
      stats: diff.stats,
      files: diff.files,
      comments,
    }
  }
}
