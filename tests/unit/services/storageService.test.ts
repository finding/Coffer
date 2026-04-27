import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from '@/services/storageService'
import type { Settings, ClipboardItem } from '@/types'

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = new StorageService()
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return default settings when none stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({})
      const result = await storageService.getSettings()
      expect(result.persistMode).toBe(false)
      expect(result.theme).toBe('light')
      expect(result.maxClipboardItems).toBe(10)
    })

    it('should return stored settings', async () => {
      const stored: Settings = { persistMode: true, theme: 'dark', maxClipboardItems: 5 }
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ settings: stored })
      const result = await storageService.getSettings()
      expect(result.persistMode).toBe(true)
    })
  })

  describe('saveSettings', () => {
    it('should save settings', async () => {
      const settings: Settings = { persistMode: true, theme: 'dark', maxClipboardItems: 5 }
      await storageService.saveSettings(settings)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings })
    })
  })

  describe('getClipboard', () => {
    it('should return empty array when none stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({})
      const result = await storageService.getClipboard()
      expect(result).toEqual([])
    })
  })

  describe('exportCookies', () => {
    it('should export cookies as JSON', async () => {
      const cookies = [{ name: 'a', value: 'b', domain: '.c.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax' as const, storeId: '0' }]
      const result = await storageService.exportCookies(cookies)
      expect(JSON.parse(result)).toEqual(cookies)
    })
  })
})
