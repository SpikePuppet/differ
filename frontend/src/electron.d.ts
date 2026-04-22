interface ElectronAPI {
  invoke<T>(channel: string, payload?: unknown): Promise<T>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
