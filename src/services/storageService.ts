import type { Settings, ClipboardItem, CookieItem } from '@/types'

const DEFAULT_SETTINGS: Settings = { persistMode: false, theme: 'light', maxClipboardItems: 10 }

export class StorageService {
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get('settings')
    return result.settings ?? DEFAULT_SETTINGS
  }

  async saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ settings })
  }

  async getClipboard(): Promise<ClipboardItem[]> {
    const result = await chrome.storage.local.get('clipboard')
    return result.clipboard ?? []
  }

  async saveClipboard(items: ClipboardItem[]): Promise<void> {
    await chrome.storage.local.set({ clipboard: items })
  }

  async clearClipboard(): Promise<void> {
    await chrome.storage.local.remove('clipboard')
  }

  async exportCookies(cookies: CookieItem[]): Promise<string> {
    return JSON.stringify(cookies, null, 2)
  }

  async importCookies(json: string): Promise<CookieItem[]> {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Invalid format')
    return parsed
  }
}

export const storageService = new StorageService()
