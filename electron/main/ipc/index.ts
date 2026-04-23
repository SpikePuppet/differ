import { registerRepoIpc } from './repos'
import { registerSessionIpc } from './sessions'
import { registerCommentIpc } from './comments'
import { registerFsIpc } from './fs'
import { registerSettingsIpc } from './settings'
import type { RepoService } from '../services/repo'
import type { SessionService } from '../services/session'
import type { CommentService } from '../services/comment'
import type { DiffService } from '../services/diff'
import type { SettingsService } from '../services/settings'

export interface Services {
  repoService: RepoService
  sessionService: SessionService
  commentService: CommentService
  diffService: DiffService
  settingsService: SettingsService
}

export function registerIpc(services: Services): void {
  registerRepoIpc(services.repoService)
  registerSessionIpc(services.sessionService, services.diffService)
  registerCommentIpc(services.commentService)
  registerFsIpc()
  registerSettingsIpc(services.settingsService)
}
