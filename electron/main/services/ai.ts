import type { DiffFile } from '../git/adapter'
import { AiRepository } from '../repositories/ai'
import { SettingsRepository } from '../repositories/settings'
import { SessionRepository } from '../repositories/session'
import { RepoRepository } from '../repositories/repo'
import { AnthropicProvider, OpenAiProvider, OpenRouterProvider, type LlmProvider } from './ai/providers'

const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-sonnet-4',
}

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
    const providerName = this.settingsRepo.get('ai_provider')?.value ?? 'anthropic'
    const apiKey = this.settingsRepo.get(`${providerName}_api_key`)?.value
    if (!apiKey) return null

    const model = this.settingsRepo.get(`${providerName}_model`)?.value ?? PROVIDER_DEFAULTS[providerName] ?? ''

    const provider = this.createProvider(providerName, apiKey, model)
    if (!provider) return null

    const { overallPrompt, filePrompts } = this.buildPrompts(diff)

    let overall: string | null = null
    const files: Record<string, string> = {}

    // Generate overall summary
    try {
      overall = await provider.generate({ prompt: overallPrompt, maxTokens: 1024 })
    } catch {
      overall = null
    }

    // Generate per-file summaries for significant changes
    for (const [path, prompt] of Object.entries(filePrompts)) {
      try {
        files[path] = await provider.generate({ prompt, maxTokens: 512 })
      } catch {
        // Skip files that fail
      }
    }

    // Persist
    this.aiRepo.create({
      session_id: sessionId,
      head_commit_sha: headCommitSha,
      provider: providerName,
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

  private createProvider(name: string, apiKey: string, model: string): LlmProvider | null {
    switch (name) {
      case 'anthropic':
        return new AnthropicProvider(apiKey, model)
      case 'openai':
        return new OpenAiProvider(apiKey, model)
      case 'openrouter':
        return new OpenRouterProvider(apiKey, model)
      default:
        return null
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
