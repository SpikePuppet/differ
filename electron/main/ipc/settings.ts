import { handle } from './utils'
import type { SettingsService } from '../services/settings'

export function registerSettingsIpc(settingsService: SettingsService): void {
  handle('settings:get', (payload: unknown) => {
    const { key } = payload as { key: string }
    return settingsService.get(key)
  })

  handle('settings:set', (payload: unknown) => {
    const { key, value } = payload as { key: string; value: string }
    settingsService.set(key, value)
    return undefined
  })
}
