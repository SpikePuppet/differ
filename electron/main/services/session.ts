import { RepoRepository } from '../repositories/repo'
import { SessionRepository } from '../repositories/session'
import { GitClient } from '../git/client'
import { NotFoundError, ConflictError } from './errors'
import { validatePathFilters } from './validators'

export class SessionService {
  constructor(
    private repoRepo: RepoRepository,
    private sessionRepo: SessionRepository,
    private gitClient: GitClient
  ) {}

  createSession(data: {
    repo_id: string
    base_ref: string
    head_ref: string | null
    path_filters: string[]
  }) {
    const repo = this.repoRepo.getById(data.repo_id)
    if (!repo) throw new NotFoundError('Repository not found')

    this.gitClient.ensureRefExists(repo.path, data.base_ref)
    if (data.head_ref) {
      this.gitClient.ensureRefExists(repo.path, data.head_ref)
    }

    const normalizedFilters = validatePathFilters(data.path_filters)
    return this.sessionRepo.create({
      repo_id: data.repo_id,
      base_ref: data.base_ref,
      head_ref: data.head_ref,
      path_filters: normalizedFilters,
    })
  }

  getSession(sessionId: string) {
    const session = this.sessionRepo.getById(sessionId)
    if (!session) throw new NotFoundError('Session not found')
    return session
  }

  listSessions() {
    return this.sessionRepo.list()
  }

  archiveSession(sessionId: string) {
    const session = this.sessionRepo.archive(sessionId)
    if (!session) throw new NotFoundError('Session not found')
    return session
  }

  ensureWritable(session: { status: string }): void {
    if (session.status === 'archived') {
      throw new ConflictError('Archived sessions are read-only')
    }
  }
}
