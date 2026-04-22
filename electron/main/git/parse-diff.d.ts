declare module 'parse-diff' {
  export interface ParsedChange {
    type: 'normal' | 'add' | 'del'
    normal?: boolean
    add?: boolean
    del?: boolean
    ln1?: number
    ln2?: number
    ln?: number
    content: string
  }

  export interface ParsedChunk {
    content: string
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    changes: ParsedChange[]
  }

  export interface ParsedFile {
    chunks: ParsedChunk[]
    deletions: number
    additions: number
    from?: string
    to?: string
    new?: boolean
    deleted?: boolean
    index?: string[]
    oldMode?: string
    newMode?: string
  }

  function parseDiff(diff: string): ParsedFile[]
  export default parseDiff
}
