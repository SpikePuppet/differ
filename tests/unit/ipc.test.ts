import { describe, it, expect } from 'vitest'

describe('ipc modules', () => {
  it('imports all ipc handler modules', async () => {
    const { registerIpc } = await import('../../electron/main/ipc/index')
    const { registerRepoIpc } = await import('../../electron/main/ipc/repos')
    const { registerSessionIpc } = await import('../../electron/main/ipc/sessions')
    const { registerCommentIpc } = await import('../../electron/main/ipc/comments')
    const { registerFsIpc } = await import('../../electron/main/ipc/fs')

    expect(typeof registerIpc).toBe('function')
    expect(typeof registerRepoIpc).toBe('function')
    expect(typeof registerSessionIpc).toBe('function')
    expect(typeof registerCommentIpc).toBe('function')
    expect(typeof registerFsIpc).toBe('function')
  })
})
