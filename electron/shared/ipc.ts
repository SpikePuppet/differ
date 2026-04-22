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

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
