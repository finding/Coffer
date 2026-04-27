import { storageService } from '@/services/storageService'
import type { MessagePayload, MessageResponse, StorageItem } from '@/types'

chrome.runtime.onInstalled.addListener(() => {
  console.log('Coffer installed')
})

chrome.cookies.onChanged.addListener((changeInfo) => {
  chrome.runtime.sendMessage({
    type: 'COOKIE_CHANGED',
    data: changeInfo
  }).catch(() => {})
})

chrome.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
  console.log('[Background] Received message:', message.action, message)
  handleMessage(message)
    .then((response) => {
      console.log('[Background] Response:', response)
      sendResponse(response)
    })
    .catch((error) => {
      console.error('[Background] Error:', error)
      sendResponse({ success: false, error: error.message })
    })
  return true
})

async function handleMessage(message: MessagePayload): Promise<MessageResponse> {
  switch (message.action) {
    case 'getClipboard':
      return { success: true, data: await storageService.getClipboard() }
    case 'setClipboard':
      await storageService.saveClipboard(message.data as Parameters<typeof storageService.saveClipboard>[0])
      return { success: true }
    case 'getSettings':
      return { success: true, data: await storageService.getSettings() }
    case 'setSettings':
      await storageService.saveSettings(message.data as Parameters<typeof storageService.saveSettings>[0])
      return { success: true }
    case 'getStorage':
      return { success: true, data: await getStorage(message.tabId as number, message.storageType as 'local' | 'session') }
    case 'setStorageItem':
      await setStorageItem(message.tabId as number, message.storageType as 'local' | 'session', message.key as string, message.value as string)
      return { success: true }
    case 'removeStorageItem':
      await removeStorageItem(message.tabId as number, message.storageType as 'local' | 'session', message.key as string)
      return { success: true }
    case 'setStorageItems':
      await setStorageItems(message.tabId as number, message.storageType as 'local' | 'session', message.items as { key: string; value: string }[])
      return { success: true }
    case 'removeStorageItems':
      await removeStorageItems(message.tabId as number, message.storageType as 'local' | 'session', message.keys as string[])
      return { success: true }
    case 'getStorageClipboard':
      return { success: true, data: await getStorageClipboard(message.storageType as 'local' | 'session') }
    case 'setStorageClipboard':
      await setStorageClipboard(message.storageType as 'local' | 'session', message.data as StorageItem[])
      return { success: true }
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function getStorage(tabId: number, type: 'local' | 'session'): Promise<{ key: string; value: string }[]> {
  console.log('[Background] getStorage called:', { tabId, type })
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string) => {
        console.log('[Script] Running in tab, storageType:', storageType)
        const storage = storageType === 'local' ? localStorage : sessionStorage
        console.log('[Script] Storage length:', storage.length)
        const items: { key: string; value: string }[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key) items.push({ key, value: storage.getItem(key) || '' })
        }
        console.log('[Script] Items:', items.length, items)
        return items
      },
      args: [type]
    })
    console.log('[Background] executeScript result:', result)
    return result?.[0]?.result || []
  } catch (e) {
    console.error('[Background] executeScript error:', e)
    return []
  }
}

async function setStorageItem(tabId: number, type: 'local' | 'session', key: string, value: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (storageType: string, k: string, v: string) => {
      const storage = storageType === 'local' ? localStorage : sessionStorage
      storage.setItem(k, v)
    },
    args: [type, key, value]
  })
}

async function removeStorageItem(tabId: number, type: 'local' | 'session', key: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (storageType: string, k: string) => {
      const storage = storageType === 'local' ? localStorage : sessionStorage
      storage.removeItem(k)
    },
    args: [type, key]
  })
}

async function setStorageItems(tabId: number, type: 'local' | 'session', items: { key: string; value: string }[]): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (storageType: string, data: { key: string; value: string }[]) => {
      const storage = storageType === 'local' ? localStorage : sessionStorage
      data.forEach(item => storage.setItem(item.key, item.value))
    },
    args: [type, items]
  })
}

async function removeStorageItems(tabId: number, type: 'local' | 'session', keys: string[]): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (storageType: string, ks: string[]) => {
      const storage = storageType === 'local' ? localStorage : sessionStorage
      ks.forEach(k => storage.removeItem(k))
    },
    args: [type, keys]
  })
}

async function getStorageClipboard(type: 'local' | 'session'): Promise<StorageItem[]> {
  const key = type === 'local' ? 'localStorageClipboard' : 'sessionStorageClipboard'
  const result = await chrome.storage.local.get(key)
  return result[key] || []
}

async function setStorageClipboard(type: 'local' | 'session', items: StorageItem[]): Promise<void> {
  const key = type === 'local' ? 'localStorageClipboard' : 'sessionStorageClipboard'
  await chrome.storage.local.set({ [key]: items })
}

export {}
