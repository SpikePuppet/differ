import parseDiff from 'parse-diff'

export interface DiffLine {
  kind: 'context' | 'add' | 'delete'
  content: string
  old_line: number | null
  new_line: number | null
}

export interface DiffHunk {
  old_start: number
  old_lines: number
  new_start: number
  new_lines: number
  header: string
  lines: DiffLine[]
}

export interface DiffFile {
  old_path: string
  new_path: string
  change_type: 'added' | 'deleted' | 'modified' | 'renamed'
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export function adaptDiff(patchText: string): DiffFile[] {
  if (!patchText || !patchText.trim()) {
    return []
  }

  const parsed = parseDiff(patchText)
  const files: DiffFile[] = []

  for (const file of parsed) {
    let changeType: DiffFile['change_type'] = 'modified'
    if (file.new) changeType = 'added'
    else if (file.deleted) changeType = 'deleted'
    else if (file.from && file.to && file.from !== file.to && !file.new && !file.deleted) {
      changeType = 'renamed'
    }

    const hunks: DiffHunk[] = []
    for (const chunk of file.chunks) {
      const lines: DiffLine[] = []
      for (const change of chunk.changes) {
        // Skip "No newline at end of file" sentinel entries
        if (change.content === '\\ No newline at end of file') {
          continue
        }

        let kind: DiffLine['kind']
        if (change.type === 'normal') kind = 'context'
        else if (change.type === 'add') kind = 'add'
        else if (change.type === 'del') kind = 'delete'
        else continue

        // Strip the leading +, -, or space from content
        let content = change.content
        if (content.length > 0 && (content[0] === '+' || content[0] === '-' || content[0] === ' ')) {
          content = content.slice(1)
        }

        if (kind === 'context') {
          lines.push({
            kind,
            content,
            old_line: change.ln1 ?? null,
            new_line: change.ln2 ?? null,
          })
        } else if (kind === 'add') {
          lines.push({
            kind,
            content,
            old_line: null,
            new_line: change.ln ?? null,
          })
        } else {
          lines.push({
            kind,
            content,
            old_line: change.ln ?? null,
            new_line: null,
          })
        }
      }

      hunks.push({
        old_start: chunk.oldStart,
        old_lines: chunk.oldLines,
        new_start: chunk.newStart,
        new_lines: chunk.newLines,
        header: '', // parse-diff discards header text after @@; frontend tolerates this
        lines,
      })
    }

    files.push({
      old_path: file.from ?? '',
      new_path: file.to ?? '',
      change_type: changeType,
      additions: file.additions,
      deletions: file.deletions,
      hunks,
    })
  }

  return files
}
