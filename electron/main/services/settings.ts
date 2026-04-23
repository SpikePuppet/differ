import { SettingsRepository } from '../repositories/settings'

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository) {}

  get(key: string): string | null {
    const row = this.settingsRepo.get(key)
    return row?.value ?? null
  }

  set(key: string, value: string): void {
    this.settingsRepo.set(key, value)
  }
}
