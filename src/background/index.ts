import { storageService } from '@/services/storageService'
import type { MessagePayload, MessageResponse } from '@/types'

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cookie Manager installed')
})

chrome.cookies.onChanged.addListener((changeInfo) => {
  chrome.runtime.sendMessage({
    type: 'COOKIE_CHANGED',
    data: changeInfo
  }).catch(() => {})
})

chrome.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
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
    default:
      return { success: false, error: 'Unknown action' }
  }
}

export {}
