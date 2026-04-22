import { describe, it, expect, beforeAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { simpleGit } from 'simple-git'
import { GitClient } from '../../electron/main/git/client'
import { adaptDiff } from '../../electron/main/git/adapter'

interface SampleRepo {
  path: string
  mainTip: string
  featureFirst: string
  featureTip: string
  otherTip: string
}

async function createSampleGitRepo(): Promise<SampleRepo> {
  const dir = mkdtempSync(join(tmpdir(), 'differ-git-test-'))
  const git = simpleGit(dir)

  await git.init(['-b', 'main'])
  await git.addConfig('user.name', 'Test User')
  await git.addConfig('user.email', 'test@example.com')
  await git.addConfig('commit.gpgsign', 'false')

  const write = (relPath: string, content: string) => {
    const abs = join(dir, relPath)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }

  write('packages/pkg-a/service.py', "def greet():\n    return 'hello from main'\n")
  write('packages/pkg-b/data.txt', 'seed-data\n')
  write('apps/web/app.js', "console.log('main');\n")
  await git.add('.')
  await git.commit('Initial monorepo layout')

  write('packages/pkg-a/service.py', "def greet():\n    return 'hello from main'\n\n\ndef version():\n    return '1.0.0'\n")
  await git.add('.')
  await git.commit('Add package version')
  const mainTip = (await git.revparse(['HEAD'])).trim()

  await git.checkout(['-b', 'feature/diff-comments'])
  write('packages/pkg-a/service.py', "def greet():\n    return 'hello from feature'\n\n\ndef version():\n    return '1.1.0'\n")
  write('apps/web/app.js', "console.log('feature');\n")
  await git.add('.')
  await git.commit('Feature updates package and app')
  const featureFirst = (await git.revparse(['HEAD'])).trim()

  write('packages/pkg-a/notes.md', '# Notes\n\nFeature branch context.\n')
  await git.add('.')
  await git.commit('Add feature notes')
  const featureTip = (await git.revparse(['HEAD'])).trim()

  await git.checkout('main')
  await git.checkout(['-b', 'other/invalid-anchor'])
  write('packages/pkg-b/data.txt', 'seed-data\nother-branch-change\n')
  await git.add('.')
  await git.commit('Other branch change')
  const otherTip = (await git.revparse(['HEAD'])).trim()
  await git.checkout('main')

  return { path: dir, mainTip, featureFirst, featureTip, otherTip }
}

describe('GitClient', () => {
  let repo: SampleRepo
  let client: GitClient

  beforeAll(async () => {
    repo = await createSampleGitRepo()
    client = new GitClient()
  }, 30000)

  it('validates a git repo', () => {
    const path = client.validateRepo(repo.path)
    expect(path).toBe(repo.path)
  })

  it('rejects a non-git directory', () => {
    const nonGit = mkdtempSync(join(tmpdir(), 'differ-not-git-'))
    expect(() => client.validateRepo(nonGit)).toThrow('not a git repository')
    rmSync(nonGit, { recursive: true, force: true })
  })

  it('resolves a branch ref to commit sha', async () => {
    const sha = await client.resolveRevision(repo.path, { ref: 'main' })
    expect(sha).toBe(repo.mainTip)
  })

  it('resolves a short commit sha', async () => {
    const short = repo.mainTip.slice(0, 7)
    const sha = await client.resolveRevision(repo.path, { commit: short })
    expect(sha).toBe(repo.mainTip)
  })

  it('checks commit reachability', async () => {
    const reachable = await client.isCommitReachable(repo.path, repo.featureFirst, 'feature/diff-comments')
    expect(reachable).toBe(true)

    const notReachable = await client.isCommitReachable(repo.path, repo.otherTip, 'feature/diff-comments')
    expect(notReachable).toBe(false)
  })

  it('gets commit summary', async () => {
    const summary = await client.getCommitSummary(repo.path, repo.mainTip, 'main')
    expect(summary.ref).toBe('main')
    expect(summary.commit).toBe(repo.mainTip)
    expect(summary.author_name).toBe('Test User')
    expect(summary.subject).toBe('Add package version')
  })

  it('diffs two branches', async () => {
    const result = await client.diff(repo.path, {
      baseCommit: repo.mainTip,
      headCommit: repo.featureFirst,
      pathFilters: [],
    })
    expect(result.stats.files_changed).toBe(2)
    expect(result.files.length).toBe(2)
    const paths = result.files.map((f) => f.new_path)
    expect(paths).toContain('apps/web/app.js')
    expect(paths).toContain('packages/pkg-a/service.py')
  })

  it('applies path filters to diff', async () => {
    const result = await client.diff(repo.path, {
      baseCommit: repo.mainTip,
      headCommit: repo.featureTip,
      pathFilters: ['packages/pkg-a'],
    })
    expect(result.stats.files_changed).toBe(2)
    const paths = result.files.map((f) => f.new_path)
    expect(paths).toContain('packages/pkg-a/service.py')
    expect(paths).toContain('packages/pkg-a/notes.md')
    expect(paths).not.toContain('apps/web/app.js')
  })
})

describe('adaptDiff', () => {
  it('maps parse-diff output to our shape', () => {
    const patch = `diff --git a/packages/pkg-a/service.py b/packages/pkg-a/service.py
index abc123..def456 100644
--- a/packages/pkg-a/service.py
+++ b/packages/pkg-a/service.py
@@ -1,2 +1,2 @@
 def greet():
-    return 'hello from main'
+    return 'hello from feature'
\ No newline at end of file
`

    const files = adaptDiff(patch)
    expect(files.length).toBe(1)
    const file = files[0]
    expect(file.old_path).toBe('packages/pkg-a/service.py')
    expect(file.new_path).toBe('packages/pkg-a/service.py')
    expect(file.change_type).toBe('modified')
    expect(file.additions).toBe(1)
    expect(file.deletions).toBe(1)
    expect(file.hunks.length).toBe(1)

    const hunk = file.hunks[0]
    expect(hunk.old_start).toBe(1)
    expect(hunk.old_lines).toBe(2)
    expect(hunk.new_start).toBe(1)
    expect(hunk.new_lines).toBe(2)
    expect(hunk.lines.length).toBe(3)

    expect(hunk.lines[0]).toEqual({
      kind: 'context',
      content: 'def greet():',
      old_line: 1,
      new_line: 1,
    })
    expect(hunk.lines[1]).toEqual({
      kind: 'delete',
      content: "    return 'hello from main'",
      old_line: 2,
      new_line: null,
    })
    expect(hunk.lines[2]).toEqual({
      kind: 'add',
      content: "    return 'hello from feature'",
      old_line: null,
      new_line: 2,
    })
  })

  it('handles new files', () => {
    const patch = `diff --git a/new.txt b/new.txt
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+line one
+line two
`
    const files = adaptDiff(patch)
    expect(files[0].change_type).toBe('added')
    expect(files[0].old_path).toBe('/dev/null')
    expect(files[0].new_path).toBe('new.txt')
    expect(files[0].additions).toBe(2)
    expect(files[0].deletions).toBe(0)
  })

  it('handles deleted files', () => {
    const patch = `diff --git a/old.txt b/old.txt
deleted file mode 100644
index e69de29..0000000
--- a/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-line one
-line two
`
    const files = adaptDiff(patch)
    expect(files[0].change_type).toBe('deleted')
    expect(files[0].old_path).toBe('old.txt')
    expect(files[0].new_path).toBe('/dev/null')
    expect(files[0].additions).toBe(0)
    expect(files[0].deletions).toBe(2)
  })

  it('handles renames', () => {
    const patch = `diff --git a/old.txt b/new.txt
similarity index 100%
rename from old.txt
rename to new.txt
`
    const files = adaptDiff(patch)
    expect(files[0].change_type).toBe('renamed')
    expect(files[0].old_path).toBe('old.txt')
    expect(files[0].new_path).toBe('new.txt')
  })

  it('filters out No newline sentinel', () => {
    const patch = `diff --git a/a.txt b/a.txt
index abc..def 100644
--- a/a.txt
+++ b/a.txt
@@ -1,2 +1,2 @@
 line one
-line two
+line two changed
\\ No newline at end of file
`
    const files = adaptDiff(patch)
    const hunk = files[0].hunks[0]
    const hasSentinel = hunk.lines.some((l) =>
      l.content.includes('No newline at end of file')
    )
    expect(hasSentinel).toBe(false)
    expect(hunk.lines.length).toBe(3)
  })

  it('returns empty array for empty patch', () => {
    expect(adaptDiff('')).toEqual([])
    expect(adaptDiff('\n\n')).toEqual([])
  })
})
