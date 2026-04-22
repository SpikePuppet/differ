export type IpcChannel =
  | 'repos:list'
  | 'repos:create'
  | 'repos:get'
  | 'sessions:list'
  | 'sessions:create'
  | 'sessions:get'
  | 'sessions:compare'
  | 'sessions:archive'
  | 'comments:list'
  | 'comments:create'
  | 'comments:update'
  | 'comments:resolve'
  | 'comments:reopen'
  | 'fs:browse'

export type IpcErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'BAD_REQUEST' | 'UNKNOWN'

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: IpcErrorCode; message: string } }

export function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

export function err(code: IpcErrorCode, message: string): IpcResult<never> {
  return { success: false, error: { code, message } }
}
