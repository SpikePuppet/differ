import Anthropic from '@anthropic-ai/sdk'
import type { DiffFile } from '../git/adapter'
import { AiRepository } from '../repositories/ai'
import { SettingsRepository } from '../repositories/settings'
import { SessionRepository } from '../repositories/session'
import { RepoRepository } from '../repositories/repo'

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'
const HAIKU_MODEL = 'claude-3-haiku-20240307'

interface DiffResponse {
  base: { ref: string | null; commit: string; subject: string }
  head: { ref: string | null; commit: string; subject: string }
  stats: { files_changed: number; additions: number; deletions: number }
  files: DiffFile[]
}

export interface AiSummaryResult {
  overall: string | null
  files: Record<string, string>
}

export class AiService {
  constructor(
    private aiRepo: AiRepository,
    private settingsRepo: SettingsRepository,
    private sessionRepo: SessionRepository,
    private repoRepo: RepoRepository,
  ) {}

  async generateSummary(sessionId: string, headCommitSha: string, diff: DiffResponse): Promise<AiSummaryResult | null> {
    const apiKey = this.settingsRepo.get('anthropic_api_key')?.value
    if (!apiKey) return null

    const model = this.settingsRepo.get('anthropic_model')?.value ?? DEFAULT_MODEL

    const client = new Anthropic({ apiKey })

    const { overallPrompt, filePrompts } = this.buildPrompts(diff)

    let overall: string | null = null
    const files: Record<string, string> = {}

    // Generate overall summary
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: overallPrompt }],
      })
      const content = response.content[0]
      if (content.type === 'text') {
        overall = content.text.trim()
      }
    } catch {
      overall = null
    }

    // Generate per-file summaries for significant changes
    for (const [path, prompt] of Object.entries(filePrompts)) {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        })
        const content = response.content[0]
        if (content.type === 'text') {
          files[path] = content.text.trim()
        }
      } catch {
        // Skip files that fail
      }
    }

    // Persist
    this.aiRepo.create({
      session_id: sessionId,
      head_commit_sha: headCommitSha,
      model,
      overall_summary: overall,
      file_summaries_json: JSON.stringify(files),
    })

    return { overall, files }
  }

  getSummary(sessionId: string, headCommitSha: string): AiSummaryResult | null {
    const row = this.aiRepo.getBySessionAndCommit(sessionId, headCommitSha)
    if (!row) return null
    return {
      overall: row.overall_summary,
      files: JSON.parse(row.file_summaries_json),
    }
  }

  private buildPrompts(diff: DiffResponse): { overallPrompt: string; filePrompts: Record<string, string> } {
    const baseRef = diff.base.ref ?? diff.base.commit.slice(0, 7)
    const headRef = diff.head.ref ?? diff.head.commit.slice(0, 7)

    // Overall prompt
    const fileList = diff.files
      .map((f) => {
        const path = f.new_path || f.old_path
        return `- ${path} (${f.change_type}, +${f.additions}/-${f.deletions})`
      })
      .join('\n')

    const overallPrompt = `You are a senior software engineer reviewing a pull request. Summarize the overall purpose and impact of these changes in 2-4 sentences. Be specific about what problem is being solved or what feature is added.

Comparing ${baseRef} → ${headRef}
${diff.head.subject ? `Head commit: ${diff.head.subject}` : ''}

Files changed (${diff.stats.files_changed}):
${fileList}

Provide a concise summary.`

    // Per-file prompts for significant changes (>50 total lines)
    const filePrompts: Record<string, string> = {}
    for (const file of diff.files) {
      const totalLines = file.additions + file.deletions
      if (totalLines <= 50) continue

      const path = file.new_path || file.old_path
      const hunkSummary = file.hunks
        .map((h) => {
          const lines = h.lines
            .filter((l) => l.kind !== 'context')
            .map((l) => `${l.kind === 'add' ? '+' : '-'} ${l.content}`)
            .join('\n')
          return `@@ -${h.old_start},${h.old_lines} +${h.new_start},${h.new_lines} @@\n${lines}`
        })
        .join('\n\n')

      // Truncate very large diffs
      const truncated = hunkSummary.length > 15000 ? hunkSummary.slice(0, 15000) + '\n... (truncated)' : hunkSummary

      filePrompts[path] = `Explain what changed in this file and why, in 1-2 sentences:

File: ${path} (${file.change_type})

${truncated}

Brief explanation:`
    }

    return { overallPrompt, filePrompts }
  }
}
