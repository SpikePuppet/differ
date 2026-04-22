import { simpleGit, type SimpleGit } from 'simple-git'
import { PathLike } from 'node:fs'
import { execSync } from 'node:child_process'

export interface CommitSummary {
  ref: string | null
  commit: string
  author_name: string
  author_email: string
  authored_at: string
  subject: string
}

export interface DiffResult {
  stats: {
    files_changed: number
    additions: number
    deletions: number
  }
  files: import('./adapter').DiffFile[]
}

export class GitClient {
  private _git(cwd: PathLike): SimpleGit {
    return simpleGit(cwd.toString())
  }

  validateRepo(path: string): string {
    const git = this._git(path)
    // simple-git will throw if not a repo when we try to use it,
    // but we want an explicit check.
    // We'll check by running rev-parse --is-inside-work-tree
    try {
      const result = execSync(
        'git rev-parse --is-inside-work-tree',
        { cwd: path, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      )
      if (result.trim() !== 'true') {
        throw new Error('Path is not a git repository')
      }
      return path
    } catch {
      throw new Error('Path is not a git repository')
    }
  }

  async ensureRefExists(repoPath: string, ref: string): Promise<void> {
    await this._git(repoPath).revparse(['--verify', ref])
  }

  async resolveRevision(
    repoPath: string,
    {
      ref,
      commit,
    }: { ref?: string | null; commit?: string | null }
  ): Promise<string> {
    if (!ref && !commit) {
      throw new Error('Either a ref or commit must be provided')
    }

    if (commit) {
      const resolved = (await this._git(repoPath).revparse([commit])).trim()
      // Verify it's a real commit object
      await this._git(repoPath).raw(['cat-file', '-e', `${resolved}^{commit}`])
      if (ref) {
        const reachable = await this.isCommitReachable(repoPath, resolved, ref)
        if (!reachable) {
          throw new Error('Commit is not reachable from the provided ref')
        }
      }
      return resolved
    }

    return (await this._git(repoPath).revparse([ref!])).trim()
  }

  async isCommitReachable(
    repoPath: string,
    commit: string,
    ref: string
  ): Promise<boolean> {
    try {
      execSync(`git merge-base --is-ancestor ${commit} ${ref}`, {
        cwd: repoPath,
        stdio: 'pipe',
      })
      return true
    } catch {
      return false
    }
  }

  async getCommitSummary(
    repoPath: string,
    commit: string,
    ref: string | null
  ): Promise<CommitSummary> {
    const output = (
      await this._git(repoPath).show([
        '-s',
        '--format=%H%x1f%an%x1f%ae%x1f%at%x1f%s',
        commit,
      ])
    ).trim()
    const [commitSha, authorName, authorEmail, authoredAt, subject] =
      output.split('\x1f')
    return {
      ref,
      commit: commitSha,
      author_name: authorName,
      author_email: authorEmail,
      authored_at: new Date(parseInt(authoredAt, 10) * 1000).toISOString(),
      subject,
    }
  }

  async diff(
    repoPath: string,
    {
      baseCommit,
      headCommit,
      pathFilters,
    }: { baseCommit: string; headCommit: string; pathFilters: string[] }
  ): Promise<DiffResult> {
    const args = [
      'diff',
      '--patch',
      '--find-renames',
      '--unified=3',
      '--no-color',
      baseCommit,
      headCommit,
    ]
    if (pathFilters.length > 0) {
      args.push('--', ...pathFilters)
    }

    const patch = await this._git(repoPath).raw(args)
    const { adaptDiff } = await import('./adapter')
    const files = adaptDiff(patch)

    const additions = files.reduce((sum, f) => sum + f.additions, 0)
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0)

    return {
      stats: {
        files_changed: files.length,
        additions,
        deletions,
      },
      files,
    }
  }
}
