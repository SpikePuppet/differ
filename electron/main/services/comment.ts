import { RepoRepository } from '../repositories/repo'
import { SessionRepository } from '../repositories/session'
import { CommentRepository } from '../repositories/comment'
import { GitClient } from '../git/client'
import { NotFoundError, ConflictError, ValidationError } from './errors'
import { validateRelativePath } from './validators'

export class CommentService {
  constructor(
    private repoRepo: RepoRepository,
    private sessionRepo: SessionRepository,
    private commentRepo: CommentRepository,
    private gitClient: GitClient
  ) {}

  createComment(data: {
    session_id: string
    head_commit_sha: string
    base_commit_sha: string | null
    file_path: string
    line_side: string
    line_number: number
    body: string
  }) {
    const { session, repo } = this._loadSessionAndRepo(data.session_id)
    this._ensureWritable(session)
    this._validateCommentPayload(repo.path, data)

    return this.commentRepo.create({
      session_id: data.session_id,
      head_commit_sha: data.head_commit_sha,
      base_commit_sha: data.base_commit_sha,
      file_path: validateRelativePath(data.file_path),
      line_side: data.line_side,
      line_number: data.line_number,
      body: data.body.trim(),
    })
  }

  listComments(filters: {
    session_id: string
    head_commit_sha?: string
    file_path?: string
    status?: string
  }) {
    const session = this.sessionRepo.getById(filters.session_id)
    if (!session) throw new NotFoundError('Session not found')

    const normalizedPath = filters.file_path
      ? validateRelativePath(filters.file_path)
      : undefined
    if (filters.status && filters.status !== 'open' && filters.status !== 'resolved') {
      throw new ValidationError('Invalid comment status')
    }

    return this.commentRepo.list({
      session_id: filters.session_id,
      head_commit_sha: filters.head_commit_sha,
      file_path: normalizedPath,
      status: filters.status,
    })
  }

  updateComment(data: {
    comment_id: string
    body?: string
    file_path?: string
    line_side?: string
    line_number?: number
  }) {
    const comment = this.commentRepo.getById(data.comment_id)
    if (!comment) throw new NotFoundError('Comment not found')

    const session = this.sessionRepo.getById(comment.session_id)
    if (!session) throw new NotFoundError('Session not found')
    this._ensureWritable(session)

    if (comment.status !== 'open') {
      throw new ConflictError('Only open comments can be edited')
    }

    if (data.body !== undefined && !data.body.trim()) {
      throw new ValidationError('Comment body cannot be empty')
    }

    const normalizedPath = data.file_path !== undefined
      ? validateRelativePath(data.file_path)
      : undefined
    if (data.line_side !== undefined && data.line_side !== 'old' && data.line_side !== 'new') {
      throw new ValidationError('Invalid line side')
    }
    if (data.line_number !== undefined && data.line_number <= 0) {
      throw new ValidationError('Line number must be positive')
    }

    const updated = this.commentRepo.update(comment.id, {
      body: data.body !== undefined ? data.body.trim() : undefined,
      file_path: normalizedPath,
      line_side: data.line_side,
      line_number: data.line_number,
    })
    if (!updated) throw new NotFoundError('Comment not found')
    return updated
  }

  resolveComment(commentId: string) {
    return this._updateStatus(commentId, 'resolved')
  }

  reopenComment(commentId: string) {
    return this._updateStatus(commentId, 'open')
  }

  private _updateStatus(commentId: string, status: string) {
    const comment = this.commentRepo.getById(commentId)
    if (!comment) throw new NotFoundError('Comment not found')

    const session = this.sessionRepo.getById(comment.session_id)
    if (!session) throw new NotFoundError('Session not found')
    this._ensureWritable(session)

    const updated = this.commentRepo.update(commentId, { status })
    if (!updated) throw new NotFoundError('Comment not found')
    return updated
  }

  private _loadSessionAndRepo(sessionId: string) {
    const session = this.sessionRepo.getById(sessionId)
    if (!session) throw new NotFoundError('Session not found')
    const repo = this.repoRepo.getById(session.repo_id)
    if (!repo) throw new NotFoundError('Repository not found')
    return { session, repo }
  }

  private _ensureWritable(session: { status: string }): void {
    if (session.status === 'archived') {
      throw new ConflictError('Archived sessions are read-only')
    }
  }

  private _validateCommentPayload(
    repoPath: string,
    data: {
      head_commit_sha: string
      base_commit_sha: string | null
      file_path: string
      line_side: string
      line_number: number
      body: string
    }
  ): void {
    this.gitClient.resolveRevision(repoPath, { commit: data.head_commit_sha })
    if (data.base_commit_sha) {
      this.gitClient.resolveRevision(repoPath, { commit: data.base_commit_sha })
    }
    validateRelativePath(data.file_path)
    if (data.line_side !== 'old' && data.line_side !== 'new') {
      throw new ValidationError('Invalid line side')
    }
    if (data.line_number <= 0) {
      throw new ValidationError('Line number must be positive')
    }
    if (!data.body.trim()) {
      throw new ValidationError('Comment body cannot be empty')
    }
  }
}
