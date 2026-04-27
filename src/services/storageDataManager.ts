import type { StorageItem } from '@/types'

export class StorageDataManager {
  async getStorage(tabId: number, type: 'local' | 'session'): Promise<StorageItem[]> {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (storageType: string) => {
          try {
            const storage = storageType === 'local' ? localStorage : sessionStorage
            const items: { key: string; value: string }[] = []
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i)
              if (key) {
                items.push({ key, value: storage.getItem(key) || '' })
              }
            }
            return items
          } catch (e) {
            console.error('Error in content script:', e)
            return []
          }
        },
        args: [type]
      })
      return result?.[0]?.result || []
    } catch (e) {
      console.error('Error executing script:', e)
      return []
    }
  }

  async setItem(tabId: number, type: 'local' | 'session', key: string, value: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string, k: string, v: string) => {
        const storage = storageType === 'local' ? localStorage : sessionStorage
        storage.setItem(k, v)
      },
      args: [type, key, value]
    })
  }

  async removeItem(tabId: number, type: 'local' | 'session', key: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string, k: string) => {
        const storage = storageType === 'local' ? localStorage : sessionStorage
        storage.removeItem(k)
      },
      args: [type, key]
    })
  }

  async setItems(tabId: number, type: 'local' | 'session', items: StorageItem[]): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string, data: { key: string; value: string }[]) => {
        const storage = storageType === 'local' ? localStorage : sessionStorage
        data.forEach(item => storage.setItem(item.key, item.value))
      },
      args: [type, items]
    })
  }

  async removeItems(tabId: number, type: 'local' | 'session', keys: string[]): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string, ks: string[]) => {
        const storage = storageType === 'local' ? localStorage : sessionStorage
        ks.forEach(k => storage.removeItem(k))
      },
      args: [type, keys]
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
