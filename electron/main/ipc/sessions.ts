import { handle } from './utils'
import type { SessionService } from '../services/session'
import type { DiffService } from '../services/diff'

export function registerSessionIpc(
  sessionService: SessionService,
  diffService: DiffService
): void {
  handle('sessions:list', () => sessionService.listSessions())

  handle('sessions:get', (payload: unknown) => {
    const { id } = payload as { id: string }
    return sessionService.getSession(id)
  })

  handle('sessions:create', (payload: unknown) => {
    const req = payload as {
      repo_id: string
      base_ref?: string
      head_ref?: string | null
      path_filters?: string[]
    }
    return sessionService.createSession({
      repo_id: req.repo_id,
      base_ref: req.base_ref ?? 'main',
      head_ref: req.head_ref ?? null,
      path_filters: req.path_filters ?? [],
    })
  })

  handle('sessions:archive', (payload: unknown) => {
    const { id } = payload as { id: string }
    return sessionService.archiveSession(id)
  })

  handle('sessions:compare', (payload: unknown) => {
    const req = payload as {
      sessionId: string
      overrides?: {
        base_ref?: string
        head_ref?: string
        base_commit?: string
        head_commit?: string
        path_filters?: string[]
      }
    }
    return diffService.compare({
      session_id: req.sessionId,
      base_ref: req.overrides?.base_ref ?? null,
      head_ref: req.overrides?.head_ref ?? null,
      base_commit: req.overrides?.base_commit ?? null,
      head_commit: req.overrides?.head_commit ?? null,
      path_filters: req.overrides?.path_filters ?? null,
    })
  })
}
