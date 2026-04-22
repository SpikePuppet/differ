import { handle } from './utils'
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

export interface FsEntry {
  name: string
  path: string
  is_git: boolean
}

export interface FsBrowseResponse {
  path: string
  parent: string | null
  is_git: boolean
  entries: FsEntry[]
}

function looksLikeGitRepo(p: string): boolean {
  try {
    const git = join(p, '.git')
    const s = statSync(git)
    return s.isDirectory() || s.isFile()
  } catch {
    return false
  }
}

export function registerFsIpc(): void {
  handle('fs:browse', (payload: unknown) => {
    const req = payload as { path?: string; showHidden?: boolean }
    const target = req.path ? resolve(req.path) : homedir()
    const showHidden = req.showHidden ?? false

    if (!statSync(target).isDirectory()) {
      throw new Error('Path is not a directory')
    }

    const entries: FsEntry[] = []
    const children = readdirSync(target)
      .filter((name) => showHidden || !name.startsWith('.'))
      .map((name) => ({ name, abs: join(target, name) }))
      .filter(({ abs }) => {
        try {
          return statSync(abs).isDirectory()
        } catch {
          return false
        }
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

    for (const { name, abs } of children) {
      entries.push({ name, path: abs, is_git: looksLikeGitRepo(abs) })
    }

    const parent = target !== '/' ? resolve(target, '..') : null

    return {
      path: target,
      parent,
      is_git: looksLikeGitRepo(target),
      entries,
    } as FsBrowseResponse
  })
}
