import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

type InspectCommandName = 'tables' | 'schema' | 'count' | 'rows' | 'query'

type InspectCommand =
  | { command: 'tables' }
  | { command: 'schema'; table: string }
  | { command: 'count'; table: string }
  | { command: 'rows'; table: string; limit?: number }
  | { command: 'query'; sql: string }

type ParsedArgs = InspectCommand & { dbPathArg?: string }

interface ResolveDbPathOptions {
  dbPathArg?: string
  platform?: NodeJS.Platform
  homeDir?: string
  appDataDir?: string
  existsSync?: (path: string) => boolean
  mustExist?: boolean
}

function isSafeTableName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return 'null'
  if (typeof value !== 'string') return String(value)

  if (key.endsWith('_json')) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  return value
}

function formatRows(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'No rows found.'

  return rows
    .map((row, index) => {
      const lines = Object.entries(row).map(([key, value]) => `${key}: ${formatValue(key, value)}`)
      return [`row ${index + 1}`, ...lines].join('\n')
    })
    .join('\n\n')
}

function candidateDbPaths(platform: NodeJS.Platform, homeDir: string, appDataDir?: string): string[] {
  switch (platform) {
    case 'darwin':
      return [
        join(homeDir, 'Library', 'Application Support', 'Differ', 'differ.db'),
        join(homeDir, 'Library', 'Application Support', 'differ', 'differ.db'),
      ]
    case 'win32':
      return [
        join(appDataDir ?? join(homeDir, 'AppData', 'Roaming'), 'Differ', 'differ.db'),
        join(appDataDir ?? join(homeDir, 'AppData', 'Roaming'), 'differ', 'differ.db'),
      ]
    default:
      return [
        join(homeDir, '.config', 'Differ', 'differ.db'),
        join(homeDir, '.config', 'differ', 'differ.db'),
      ]
  }
}

export function resolveDbPath({
  dbPathArg,
  platform = process.platform,
  homeDir = homedir(),
  appDataDir = process.env.APPDATA,
  existsSync: pathExists = existsSync,
  mustExist = false,
}: ResolveDbPathOptions): string {
  if (dbPathArg) {
    if (!mustExist) return dbPathArg
    if (pathExists(dbPathArg)) return dbPathArg
    throw new Error(`Database file not found: ${dbPathArg}`)
  }

  const candidates = candidateDbPaths(platform, homeDir, appDataDir)
  if (!mustExist) return candidates[0]!

  const resolved = candidates.find((candidate) => pathExists(candidate))
  if (resolved) return resolved

  throw new Error(
    `Could not find Differ database automatically. Pass --db /absolute/path/to/differ.db.\nChecked:\n${candidates.join('\n')}`
  )
}

export function validateSelectQuery(sql: string): void {
  const trimmed = sql.trim()
  if (trimmed.length === 0) throw new Error('Query cannot be empty')

  const withoutTrailingSemicolon = trimmed.endsWith(';') ? trimmed.slice(0, -1).trim() : trimmed
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Multiple SQL statements are not allowed')
  }

  if (!/^select\b/i.test(withoutTrailingSemicolon)) {
    throw new Error('Only SELECT queries are allowed')
  }
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) {
    throw new Error('No command provided. Use one of: tables, schema, count, rows, query')
  }

  const tokens = [...argv]
  let dbPathArg: string | undefined
  let limit: number | undefined

  for (let i = 0; i < tokens.length; ) {
    const token = tokens[i]
    if (token === '--db') {
      const value = tokens[i + 1]
      if (!value) throw new Error('Missing value for --db')
      dbPathArg = value
      tokens.splice(i, 2)
      continue
    }
    if (token === '--limit') {
      const value = tokens[i + 1]
      if (!value) throw new Error('Missing value for --limit')
      const parsed = Number.parseInt(value, 10)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('--limit must be a positive integer')
      }
      limit = parsed
      tokens.splice(i, 2)
      continue
    }
    i += 1
  }

  const [command, ...rest] = tokens
  switch (command as InspectCommandName) {
    case 'tables':
      return { command: 'tables', dbPathArg }
    case 'schema':
      if (!rest[0]) throw new Error('schema requires a table name')
      return { command: 'schema', table: rest[0], dbPathArg }
    case 'count':
      if (!rest[0]) throw new Error('count requires a table name')
      return { command: 'count', table: rest[0], dbPathArg }
    case 'rows':
      if (!rest[0]) throw new Error('rows requires a table name')
      return { command: 'rows', table: rest[0], limit, dbPathArg }
    case 'query':
      if (!rest[0]) throw new Error('query requires a SQL string')
      return { command: 'query', sql: rest.join(' '), dbPathArg }
    default:
      throw new Error(`Unknown command: ${command}`)
  }
}

export function executeCommand(dbPath: string, parsed: InspectCommand): string {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })

  try {
    switch (parsed.command) {
      case 'tables': {
        const rows = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
          )
          .all() as Array<{ name: string }>
        return rows.map((row) => row.name).join('\n')
      }

      case 'schema': {
        if (!isSafeTableName(parsed.table)) throw new Error(`Invalid table name: ${parsed.table}`)
        const rows = db.prepare(`PRAGMA table_info(${parsed.table})`).all() as Array<{
          name: string
          type: string
          notnull: number
          dflt_value: string | null
          pk: number
        }>
        if (rows.length === 0) throw new Error(`Table not found: ${parsed.table}`)
        return rows
          .map((row) =>
            [row.name, row.type || 'TEXT', row.notnull ? 'NOT NULL' : 'NULL', row.pk ? 'PRIMARY KEY' : '']
              .filter(Boolean)
              .join(' ')
          )
          .join('\n')
      }

      case 'count': {
        if (!isSafeTableName(parsed.table)) throw new Error(`Invalid table name: ${parsed.table}`)
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${parsed.table}`).get() as { count: number }
        return `${parsed.table}: ${row.count}`
      }

      case 'rows': {
        if (!isSafeTableName(parsed.table)) throw new Error(`Invalid table name: ${parsed.table}`)
        const limit = parsed.limit ?? 10
        const rows = db.prepare(`SELECT * FROM ${parsed.table} ORDER BY rowid DESC LIMIT ?`).all(limit) as Record<
          string,
          unknown
        >[]
        return formatRows(rows)
      }

      case 'query': {
        validateSelectQuery(parsed.sql)
        const rows = db.prepare(parsed.sql).all() as Record<string, unknown>[]
        return formatRows(rows)
      }
    }
  } finally {
    db.close()
  }
}

export function runCli(argv: string[]): string {
  const parsed = parseArgs(argv)
  const dbPath = resolveDbPath({ dbPathArg: parsed.dbPathArg, mustExist: true })
  return executeCommand(dbPath, parsed)
}

async function main(): Promise<void> {
  try {
    const output = runCli(process.argv.slice(2))
    process.stdout.write(`${output}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main()
}
