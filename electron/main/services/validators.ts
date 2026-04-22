import { ValidationError } from '../services/errors'

export function validateRelativePath(path: string): string {
  if (!path) throw new ValidationError('Invalid path')
  if (path.startsWith('/')) throw new ValidationError('Invalid path')
  if (path.includes('..')) throw new ValidationError('Invalid path')
  return path.replace(/\/+$/, '')
}

export function validatePathFilters(filters: string[] | null | undefined): string[] {
  if (!filters || filters.length === 0) return []
  return filters.map((f) => validateRelativePath(f))
}
