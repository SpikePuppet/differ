import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannel } from '@shared/ipc'

const electronAPI = {
  invoke: <T>(channel: IpcChannel, payload?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, payload),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
