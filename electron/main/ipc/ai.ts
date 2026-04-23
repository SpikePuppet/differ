import { handle } from './utils'
import type { AiService } from '../services/ai'
import type { DiffFile } from '../git/adapter'

export function registerAiIpc(aiService: AiService): void {
  handle('ai:get', (payload: unknown) => {
    const { sessionId, headCommitSha } = payload as { sessionId: string; headCommitSha: string }
    return aiService.getSummary(sessionId, headCommitSha)
  })

  handle('ai:generate', (payload: unknown) => {
    const req = payload as {
      sessionId: string
      headCommitSha: string
      diff: {
        base: { ref: string | null; commit: string; subject: string }
        head: { ref: string | null; commit: string; subject: string }
        stats: { files_changed: number; additions: number; deletions: number }
        files: DiffFile[]
      }
    }
    return aiService.generateSummary(req.sessionId, req.headCommitSha, req.diff)
  })
}
