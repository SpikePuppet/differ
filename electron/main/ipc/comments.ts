import { handle } from './utils'
import type { CommentService } from '../services/comment'

export function registerCommentIpc(commentService: CommentService): void {
  handle('comments:list', (payload: unknown) => {
    const req = payload as {
      sessionId: string
      head_commit_sha?: string
      file_path?: string
      status?: string
    }
    return commentService.listComments({
      session_id: req.sessionId,
      head_commit_sha: req.head_commit_sha,
      file_path: req.file_path,
      status: req.status,
    })
  })

  handle('comments:create', async (payload: unknown) => {
    const req = payload as {
      sessionId: string
      head_commit_sha: string
      base_commit_sha?: string | null
      file_path: string
      line_side: string
      line_number: number
      body: string
    }
    return commentService.createComment({
      session_id: req.sessionId,
      head_commit_sha: req.head_commit_sha,
      base_commit_sha: req.base_commit_sha ?? null,
      file_path: req.file_path,
      line_side: req.line_side,
      line_number: req.line_number,
      body: req.body,
    })
  })

  handle('comments:update', (payload: unknown) => {
    const req = payload as {
      id: string
      body?: string
      file_path?: string
      line_side?: string
      line_number?: number
    }
    return commentService.updateComment({
      comment_id: req.id,
      body: req.body,
      file_path: req.file_path,
      line_side: req.line_side,
      line_number: req.line_number,
    })
  })

  handle('comments:resolve', (payload: unknown) => {
    const { id } = payload as { id: string }
    return commentService.resolveComment(id)
  })

  handle('comments:reopen', (payload: unknown) => {
    const { id } = payload as { id: string }
    return commentService.reopenComment(id)
  })
}
