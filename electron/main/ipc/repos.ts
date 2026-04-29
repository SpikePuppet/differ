import { handle } from './utils'
import type { RepoService } from '../services/repo'

export function registerRepoIpc(repoService: RepoService): void {
  handle('repos:list', () => repoService.listRepos())

  handle('repos:get', (payload: unknown) => {
    const { id } = payload as { id: string }
    return repoService.getRepo(id)
  })

  handle('repos:create', (payload: unknown) => {
    const { path } = payload as { path: string }
    return repoService.registerRepo(path)
  })

  handle('repos:branches', (payload: unknown) => {
    const { id } = payload as { id: string }
    return repoService.getBranches(id)
  })
}
