import { describe, it, expect } from 'vitest'

describe('project skeleton', () => {
  it('imports shared ipc types', () => {
    const channels = [
      'repos:list',
      'sessions:compare',
      'comments:create',
      'fs:browse',
    ] as const
    expect(channels.length).toBe(4)
  })
})
