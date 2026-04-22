import { ipcMain } from 'electron'
import type { IpcChannel, IpcResult } from '@shared/ipc'

export function handle<T>(
  channel: IpcChannel,
  handler: (payload: unknown) => Promise<T> | T
): void {
  ipcMain.handle(channel, async (_, payload) => {
    try {
      const data = await handler(payload)
      return { success: true, data } as IpcResult<T>
    } catch (e) {
      const error = e as Error & { statusCode?: number }
      let code: import('@shared/ipc').IpcErrorCode = 'UNKNOWN'
      if (error.statusCode === 404) code = 'NOT_FOUND'
      else if (error.statusCode === 409) code = 'CONFLICT'
      else if (error.statusCode === 422) code = 'VALIDATION'
      else if (error.statusCode === 400) code = 'BAD_REQUEST'
      return { success: false, error: { code, message: error.message } } as IpcResult<never>
    }
  })
}
