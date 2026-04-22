import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiError } from '../../frontend/src/api'

describe('api bridge', () => {
  let invokeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock = vi.fn()
    ;(globalThis as any).window = {
      electronAPI: { invoke: invokeMock },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unwraps successful IpcResult', async () => {
    invokeMock.mockResolvedValue({ success: true, data: [{ id: '1', name: 'test' }] })
    const repos = await api.repos.list()
    expect(repos).toEqual([{ id: '1', name: 'test' }])
    expect(invokeMock).toHaveBeenCalledWith('repos:list', undefined)
  })

  it('throws ApiError on failed IpcResult', async () => {
    invokeMock.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Repo not found' },
    })
    await expect(api.repos.get('bad-id')).rejects.toThrow(ApiError)
    await expect(api.repos.get('bad-id')).rejects.toThrow('Repo not found')
  })

  it('maps error codes to status codes', async () => {
    invokeMock.mockResolvedValue({
      success: false,
      error: { code: 'VALIDATION', message: 'Invalid' },
    })
    try {
      await api.repos.create('/bad')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(422)
    }
  })

  it('calls fs:browse with correct payload', async () => {
    invokeMock.mockResolvedValue({
      success: true,
      data: { path: '/Users', parent: '/', is_git: false, entries: [] },
    })
    const result = await api.fs.browse('/Users', true)
    expect(invokeMock).toHaveBeenCalledWith('fs:browse', { path: '/Users', showHidden: true })
    expect(result.path).toBe('/Users')
  })
})
