import { RepoRepository } from '../repositories/repo'
import { GitClient } from '../git/client'
import { NotFoundError, ConflictError } from './errors'
import { basename } from 'node:path'

export class RepoService {
  constructor(
    private repoRepo: RepoRepository,
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

  async getBranches(repoId: string) {
    const repo = this.repoRepo.getById(repoId)
    if (!repo) throw new NotFoundError('Repository not found')
    return this.gitClient.getBranches(repo.path)
  }
}
