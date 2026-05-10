import { RepoRepository } from '../repositories/repo'
import { SessionRepository } from '../repositories/session'
import { CommentRepository } from '../repositories/comment'
import { AiRepository } from '../repositories/ai'
import { GitClient } from '../git/client'
import { NotFoundError, ConflictError } from './errors'
import { basename } from 'node:path'

export class RepoService {
  constructor(
    private repoRepo: RepoRepository,
    private sessionRepo: SessionRepository,
    private commentRepo: CommentRepository,
    private aiRepo: AiRepository,
    private gitClient: GitClient
  ) {}

  registerRepo(path: string) {
    const normalizedPath = this.gitClient.validateRepo(path)
    const existing = this.repoRepo.getByPath(normalizedPath)
    if (existing) {
      throw new ConflictError('Repository is already registered')
    }
    const name = basename(normalizedPath)
    return this.repoRepo.create(name, normalizedPath)
  }

  getRepo(repoId: string) {
    const repo = this.repoRepo.getById(repoId)
    if (!repo) throw new NotFoundError('Repository not found')
    return repo
  }

  listRepos() {
    return this.repoRepo.list()
  }

  deleteRepo(repoId: string) {
    const repo = this.repoRepo.getById(repoId)
    if (!repo) throw new NotFoundError('Repository not found')

    this.repoRepo.withTransaction(() => {
      const sessionIds = this.sessionRepo.listByRepo(repoId).map((session) => session.id)
      if (sessionIds.length > 0) {
        this.aiRepo.deleteBySessions(sessionIds)
        this.commentRepo.deleteBySessions(sessionIds)
        this.sessionRepo.deleteByRepo(repoId)
      }
      this.repoRepo.delete(repoId)
    })

    return repo
  }

  async getBranches(repoId: string) {
    const repo = this.repoRepo.getById(repoId)
    if (!repo) throw new NotFoundError('Repository not found')
    return this.gitClient.getBranches(repo.path)
  }

  async getRepoBranches(repoId: string) {
    return this.getBranches(repoId)
  }

  async getCommits(repoId: string, ref?: string, maxCount?: number) {
    const repo = this.repoRepo.getById(repoId)
    if (!repo) throw new NotFoundError('Repository not found')
    return this.gitClient.getCommits(repo.path, ref, maxCount)
  }
}
