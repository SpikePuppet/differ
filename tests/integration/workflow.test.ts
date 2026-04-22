import { describe, it, expect, beforeAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { simpleGit } from 'simple-git'
import { createDatabase } from '../../electron/main/db/index'
import { RepoRepository } from '../../electron/main/repositories/repo'
import { SessionRepository } from '../../electron/main/repositories/session'
import { CommentRepository } from '../../electron/main/repositories/comment'
import { GitClient } from '../../electron/main/git/client'
import { RepoService } from '../../electron/main/services/repo'
import { SessionService } from '../../electron/main/services/session'
import { CommentService } from '../../electron/main/services/comment'
import { DiffService } from '../../electron/main/services/diff'

async function createSampleGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'differ-integ-'))
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

function setupServices(dbPath: string) {
  const db = createDatabase(dbPath)
  const repoRepo = new RepoRepository(db)
  const sessionRepo = new SessionRepository(db)
  const commentRepo = new CommentRepository(db)
  const gitClient = new GitClient()

  return {
    repoService: new RepoService(repoRepo, gitClient),
    sessionService: new SessionService(repoRepo, sessionRepo, gitClient),
    commentService: new CommentService(repoRepo, sessionRepo, commentRepo, gitClient),
    diffService: new DiffService(repoRepo, sessionRepo, commentRepo, gitClient),
  }
}

describe('integration: repos', () => {
  it('registers and lists a repo', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const created = services.repoService.registerRepo(repo.path)
    expect(created.path).toBe(repo.path)

    const list = services.repoService.listRepos()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(created.id)

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)

  it('rejects non-git directory', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const nonGit = mkdtempSync(join(tmpdir(), 'not-git-'))
    const services = setupServices(dbPath)

    expect(() => services.repoService.registerRepo(nonGit)).toThrow('not a git repository')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(nonGit, { recursive: true, force: true })
  })
})

describe('integration: sessions', () => {
  it('creates, gets, lists, and archives a session', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: ['packages/pkg-a'],
    })
    expect(session.base_ref).toBe('main')
    expect(session.head_ref).toBe('feature/diff-comments')
    expect(session.path_filters).toEqual(['packages/pkg-a'])
    expect(session.status).toBe('active')

    const got = services.sessionService.getSession(session.id)
    expect(got.id).toBe(session.id)

    const list = services.sessionService.listSessions()
    expect(list.length).toBe(1)

    const archived = services.sessionService.archiveSession(session.id)
    expect(archived.status).toBe('archived')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)

  it('rejects comments on archived session', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    const compareResult = await services.diffService.compare({ session_id: session.id })
    services.sessionService.archiveSession(session.id)

    await expect(
      services.commentService.createComment({
        session_id: session.id,
        head_commit_sha: compareResult.head.commit,
        base_commit_sha: compareResult.base.commit,
        file_path: 'packages/pkg-a/service.py',
        line_side: 'new',
        line_number: 2,
        body: 'This should be rejected.',
      })
    ).rejects.toThrow('read-only')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)
})

describe('integration: compare', () => {
  it('compares branch tips', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    const result = await services.diffService.compare({ session_id: session.id })
    expect(result.base.ref).toBe('main')
    expect(result.head.ref).toBe('feature/diff-comments')
    expect(result.head.commit).toBe(repo.featureTip)
    expect(result.stats.files_changed).toBe(3)
    const paths = result.files.map((f) => f.new_path)
    expect(paths).toContain('apps/web/app.js')
    expect(paths).toContain('packages/pkg-a/notes.md')
    expect(paths).toContain('packages/pkg-a/service.py')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)

  it('compares branch to commit and commit to commit', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    const branchToCommit = await services.diffService.compare({
      session_id: session.id,
      head_commit: repo.featureFirst,
    })
    expect(branchToCommit.head.commit).toBe(repo.featureFirst)
    expect(branchToCommit.stats.files_changed).toBe(2)

    const commitToCommit = await services.diffService.compare({
      session_id: session.id,
      base_commit: repo.mainTip,
      head_commit: repo.featureFirst,
    })
    expect(commitToCommit.base.commit).toBe(repo.mainTip)
    expect(commitToCommit.head.commit).toBe(repo.featureFirst)

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)

  it('rejects commit not reachable from ref', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    await expect(
      services.diffService.compare({
        session_id: session.id,
        head_ref: 'feature/diff-comments',
        head_commit: repo.otherTip,
      })
    ).rejects.toThrow('not reachable')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)

  it('supports path filters', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    const result = await services.diffService.compare({
      session_id: session.id,
      path_filters: ['packages/pkg-a'],
    })
    expect(result.stats.files_changed).toBe(2)
    const paths = result.files.map((f) => f.new_path)
    expect(paths).toContain('packages/pkg-a/notes.md')
    expect(paths).toContain('packages/pkg-a/service.py')
    expect(paths).not.toContain('apps/web/app.js')

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)
})

describe('integration: comments', () => {
  it('full comment lifecycle and compare echo', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    const registered = services.repoService.registerRepo(repo.path)
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })

    const compareResult = await services.diffService.compare({ session_id: session.id })
    const headCommitSha = compareResult.head.commit

    const created = await services.commentService.createComment({
      session_id: session.id,
      head_commit_sha: headCommitSha,
      file_path: 'packages/pkg-a/service.py',
      line_side: 'new',
      line_number: 2,
      body: 'Consider whether this greeting should be configurable.',
    })
    expect(created.status).toBe('open')

    const listed = services.commentService.listComments({
      session_id: session.id,
      head_commit_sha: headCommitSha,
    })
    expect(listed.length).toBe(1)

    const updated = services.commentService.updateComment({
      comment_id: created.id,
      body: 'Consider making this greeting configurable.',
    })
    expect(updated.body).toBe('Consider making this greeting configurable.')

    const resolved = services.commentService.resolveComment(created.id)
    expect(resolved.status).toBe('resolved')

    const reopened = services.commentService.reopenComment(created.id)
    expect(reopened.status).toBe('open')

    const compareWithComments = await services.diffService.compare({ session_id: session.id })
    expect(compareWithComments.comments.length).toBe(1)
    expect(compareWithComments.comments[0].id).toBe(created.id)

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)
})

describe('integration: full workflow', () => {
  it('matches the original pytest workflow', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'differ-test-'))
    const dbPath = join(dbDir, 'test.db')
    const repo = await createSampleGitRepo()
    const services = setupServices(dbPath)

    // 1. Register repo
    const registered = services.repoService.registerRepo(repo.path)
    expect(registered.name).toBeDefined()
    expect(registered.path).toBe(repo.path)

    // 2. Create session
    const session = services.sessionService.createSession({
      repo_id: registered.id,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: ['packages/pkg-a', 'apps/web'],
    })
    expect(session.path_filters).toEqual(['packages/pkg-a', 'apps/web'])

    // 3. Compare with head_commit override
    const compareResult = await services.diffService.compare({
      session_id: session.id,
      head_commit: repo.featureFirst,
    })
    expect(compareResult.base.commit).toBe(repo.mainTip)
    expect(compareResult.head.commit).toBe(repo.featureFirst)

    // 4. Create comment
    const comment = await services.commentService.createComment({
      session_id: session.id,
      head_commit_sha: compareResult.head.commit,
      base_commit_sha: compareResult.base.commit,
      file_path: 'apps/web/app.js',
      line_side: 'new',
      line_number: 1,
      body: 'Frontend should surface this console output change inline.',
    })
    expect(comment.file_path).toBe('apps/web/app.js')

    // 5. List comments
    const comments = services.commentService.listComments({
      session_id: session.id,
      head_commit_sha: compareResult.head.commit,
    })
    expect(comments.length).toBe(1)
    expect(comments[0].file_path).toBe('apps/web/app.js')

    // 6. Compare echoes the comment back
    const compareAgain = await services.diffService.compare({
      session_id: session.id,
      head_commit: repo.featureFirst,
    })
    expect(compareAgain.comments.length).toBe(1)
    expect(compareAgain.comments[0].id).toBe(comment.id)

    rmSync(dbDir, { recursive: true, force: true })
    rmSync(repo.path, { recursive: true, force: true })
  }, 30000)
})
