import { describe, it, expect, beforeAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { simpleGit } from 'simple-git'
import Database from 'better-sqlite3'
import { createDatabase } from '../../electron/main/db/index'
import { RepoRepository } from '../../electron/main/repositories/repo'
import { SessionRepository } from '../../electron/main/repositories/session'
import { CommentRepository } from '../../electron/main/repositories/comment'
import { GitClient } from '../../electron/main/git/client'
import { RepoService } from '../../electron/main/services/repo'
import { SessionService } from '../../electron/main/services/session'
import { CommentService } from '../../electron/main/services/comment'
import { DiffService } from '../../electron/main/services/diff'

interface TestContext {
  db: Database.Database
  repoPath: string
  mainTip: string
  featureFirst: string
  featureTip: string
  otherTip: string
  cleanup: () => void
}

async function setup(): Promise<TestContext> {
  const dbDir = mkdtempSync(join(tmpdir(), 'differ-svc-test-'))
  const dbPath = join(dbDir, 'test.db')
  const db = createDatabase(dbPath)

  const repoDir = mkdtempSync(join(tmpdir(), 'differ-svc-git-'))
  const git = simpleGit(repoDir)

  await git.init(['-b', 'main'])
  await git.addConfig('user.name', 'Test User')
  await git.addConfig('user.email', 'test@example.com')
  await git.addConfig('commit.gpgsign', 'false')

  const write = (relPath: string, content: string) => {
    const abs = join(repoDir, relPath)
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

  return {
    db,
    repoPath: repoDir,
    mainTip,
    featureFirst,
    featureTip,
    otherTip,
    cleanup: () => {
      rmSync(dbDir, { recursive: true, force: true })
      rmSync(repoDir, { recursive: true, force: true })
    },
  }
}

function makeServices(db: Database.Database, gitClient: GitClient) {
  const repoRepo = new RepoRepository(db)
  const sessionRepo = new SessionRepository(db)
  const commentRepo = new CommentRepository(db)

  return {
    repoService: new RepoService(repoRepo, gitClient),
    sessionService: new SessionService(repoRepo, sessionRepo, gitClient),
    commentService: new CommentService(repoRepo, sessionRepo, commentRepo, gitClient),
    diffService: new DiffService(repoRepo, sessionRepo, commentRepo, gitClient),
  }
}

describe('RepoService', () => {
  let ctx: TestContext
  let services: ReturnType<typeof makeServices>

  beforeAll(async () => {
    ctx = await setup()
    services = makeServices(ctx.db, new GitClient())
  }, 30000)

  it('registers a repo', () => {
    const repo = services.repoService.registerRepo(ctx.repoPath)
    expect(repo.name.startsWith('differ-svc-git-')).toBe(true) // basename of temp dir
    expect(repo.path).toBe(ctx.repoPath)
  })

  it('rejects duplicate registration', () => {
    expect(() => services.repoService.registerRepo(ctx.repoPath)).toThrow('already registered')
  })

  it('rejects non-git path', () => {
    const nonGit = mkdtempSync(join(tmpdir(), 'not-git-'))
    expect(() => services.repoService.registerRepo(nonGit)).toThrow('not a git repository')
    rmSync(nonGit, { recursive: true, force: true })
  })

  it('lists repos', () => {
    const repos = services.repoService.listRepos()
    expect(repos.length).toBe(1)
  })

  it('gets a repo by id', () => {
    const repos = services.repoService.listRepos()
    const found = services.repoService.getRepo(repos[0].id)
    expect(found.id).toBe(repos[0].id)
  })

  it('throws for missing repo', () => {
    expect(() => services.repoService.getRepo('no-such-id')).toThrow('not found')
  })
})

describe('SessionService', () => {
  let ctx: TestContext
  let services: ReturnType<typeof makeServices>
  let repoId: string

  beforeAll(async () => {
    ctx = await setup()
    services = makeServices(ctx.db, new GitClient())
    const repo = services.repoService.registerRepo(ctx.repoPath)
    repoId = repo.id
  }, 30000)

  it('creates a session', () => {
    const session = services.sessionService.createSession({
      repo_id: repoId,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: ['packages/pkg-a'],
    })
    expect(session.base_ref).toBe('main')
    expect(session.head_ref).toBe('feature/diff-comments')
    expect(session.path_filters).toEqual(['packages/pkg-a'])
    expect(session.status).toBe('active')
  })

  it('lists sessions', () => {
    const sessions = services.sessionService.listSessions()
    expect(sessions.length).toBe(1)
  })

  it('archives a session', () => {
    const sessions = services.sessionService.listSessions()
    const archived = services.sessionService.archiveSession(sessions[0].id)
    expect(archived.status).toBe('archived')
  })

  it('rejects writes on archived session', () => {
    const sessions = services.sessionService.listSessions()
    const archived = sessions.find((s) => s.status === 'archived')!
    expect(() => services.sessionService.ensureWritable(archived)).toThrow('read-only')
  })
})

describe('CommentService', () => {
  let ctx: TestContext
  let services: ReturnType<typeof makeServices>
  let repoId: string
  let sessionId: string
  let headCommit: string

  beforeAll(async () => {
    ctx = await setup()
    services = makeServices(ctx.db, new GitClient())
    const repo = services.repoService.registerRepo(ctx.repoPath)
    repoId = repo.id

    const session = services.sessionService.createSession({
      repo_id: repoId,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })
    sessionId = session.id
    headCommit = ctx.featureFirst
  }, 30000)

  it('creates a comment', () => {
    const comment = services.commentService.createComment({
      session_id: sessionId,
      head_commit_sha: headCommit,
      base_commit_sha: ctx.mainTip,
      file_path: 'packages/pkg-a/service.py',
      line_side: 'new',
      line_number: 2,
      body: 'Consider making this greeting configurable.',
    })
    expect(comment.status).toBe('open')
    expect(comment.body).toBe('Consider making this greeting configurable.')
  })

  it('lists comments', () => {
    const comments = services.commentService.listComments({
      session_id: sessionId,
      head_commit_sha: headCommit,
    })
    expect(comments.length).toBe(1)
  })

  it('updates a comment', () => {
    const comments = services.commentService.listComments({ session_id: sessionId })
    const updated = services.commentService.updateComment({
      comment_id: comments[0].id,
      body: 'Updated body',
    })
    expect(updated.body).toBe('Updated body')
  })

  it('resolves and reopens a comment', () => {
    const comments = services.commentService.listComments({ session_id: sessionId })
    const resolved = services.commentService.resolveComment(comments[0].id)
    expect(resolved.status).toBe('resolved')

    const reopened = services.commentService.reopenComment(comments[0].id)
    expect(reopened.status).toBe('open')
  })

  it('rejects editing resolved comment', () => {
    const comments = services.commentService.listComments({ session_id: sessionId })
    services.commentService.resolveComment(comments[0].id)
    expect(() =>
      services.commentService.updateComment({ comment_id: comments[0].id, body: 'oops' })
    ).toThrow('Only open comments can be edited')
  })
})

describe('DiffService', () => {
  let ctx: TestContext
  let services: ReturnType<typeof makeServices>
  let repoId: string
  let sessionId: string

  beforeAll(async () => {
    ctx = await setup()
    services = makeServices(ctx.db, new GitClient())
    const repo = services.repoService.registerRepo(ctx.repoPath)
    repoId = repo.id

    const session = services.sessionService.createSession({
      repo_id: repoId,
      base_ref: 'main',
      head_ref: 'feature/diff-comments',
      path_filters: [],
    })
    sessionId = session.id
  }, 30000)

  it('compares branch tips', async () => {
    const result = await services.diffService.compare({
      session_id: sessionId,
    })
    expect(result.base.ref).toBe('main')
    expect(result.head.ref).toBe('feature/diff-comments')
    expect(result.head.commit).toBe(ctx.featureTip)
    expect(result.stats.files_changed).toBe(3)
  })

  it('compares branch to commit', async () => {
    const result = await services.diffService.compare({
      session_id: sessionId,
      head_commit: ctx.featureFirst,
    })
    expect(result.head.commit).toBe(ctx.featureFirst)
    expect(result.stats.files_changed).toBe(2)
  })

  it('compares commit to commit', async () => {
    const result = await services.diffService.compare({
      session_id: sessionId,
      base_commit: ctx.mainTip,
      head_commit: ctx.featureFirst,
    })
    expect(result.base.commit).toBe(ctx.mainTip)
    expect(result.head.commit).toBe(ctx.featureFirst)
  })

  it('rejects unreachable commit', async () => {
    await expect(
      services.diffService.compare({
        session_id: sessionId,
        head_ref: 'feature/diff-comments',
        head_commit: ctx.otherTip,
      })
    ).rejects.toThrow('not reachable')
  })

  it('applies path filters', async () => {
    const result = await services.diffService.compare({
      session_id: sessionId,
      path_filters: ['packages/pkg-a'],
    })
    expect(result.stats.files_changed).toBe(2)
    const paths = result.files.map((f) => f.new_path)
    expect(paths).toContain('packages/pkg-a/service.py')
    expect(paths).toContain('packages/pkg-a/notes.md')
    expect(paths).not.toContain('apps/web/app.js')
  })

  it('echoes comments for matching head commit', async () => {
    const compareResult = await services.diffService.compare({
      session_id: sessionId,
      head_commit: ctx.featureFirst,
    })

    services.commentService.createComment({
      session_id: sessionId,
      head_commit_sha: compareResult.head.commit,
      base_commit_sha: compareResult.base.commit,
      file_path: 'apps/web/app.js',
      line_side: 'new',
      line_number: 1,
      body: 'Frontend should surface this console output change inline.',
    })

    const result = await services.diffService.compare({
      session_id: sessionId,
      head_commit: ctx.featureFirst,
    })
    expect(result.comments.length).toBe(1)
    expect(result.comments[0].file_path).toBe('apps/web/app.js')
  })
})
