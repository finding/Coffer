import type { StorageItem, MessageResponse } from '@/types'

export class StorageDataManager {
  async getStorage(tabId: number, type: 'local' | 'session'): Promise<StorageItem[]> {
    console.log('[StorageDataManager] getStorage called:', { tabId, type })
    try {
      const message = {
        action: 'getStorage',
        tabId,
        storageType: type
      }
      console.log('[StorageDataManager] Sending message:', message)
      const response = await chrome.runtime.sendMessage(message) as MessageResponse<StorageItem[]>
      console.log('[StorageDataManager] Response:', response)
      return response?.data || []
    } catch (e) {
      console.error('[StorageDataManager] Error:', e)
      return []
    }
  }

  async setItem(tabId: number, type: 'local' | 'session', key: string, value: string): Promise<void> {
    await chrome.runtime.sendMessage({
      action: 'setStorageItem',
      tabId,
      storageType: type,
      key,
      value
    })
  }

  async removeItem(tabId: number, type: 'local' | 'session', key: string): Promise<void> {
    await chrome.runtime.sendMessage({
      action: 'removeStorageItem',
      tabId,
      storageType: type,
      key
    })
  }

  async setItems(tabId: number, type: 'local' | 'session', items: StorageItem[]): Promise<void> {
    await chrome.runtime.sendMessage({
      action: 'setStorageItems',
      tabId,
      storageType: type,
      items
    })
  }

  async removeItems(tabId: number, type: 'local' | 'session', keys: string[]): Promise<void> {
    await chrome.runtime.sendMessage({
      action: 'removeStorageItems',
      tabId,
      storageType: type,
      keys
    })
  }

  filterByKeyword(items: StorageItem[], keyword: string): StorageItem[] {
    if (!keyword) return items
    const k = keyword.toLowerCase()
    return items.filter(item =>
      item.key.toLowerCase().includes(k) ||
      item.value.toLowerCase().includes(k)
    )
  }
}

export const storageDataManager = new StorageDataManager()
