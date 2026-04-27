<template>
  <div class="w-80 p-4 bg-gray-50 min-h-[400px]">
    <StatusCard 
      :domain="currentDomain" 
      :cookie-count="cookieCount"
      :local-storage-count="localStorageCount"
      :session-storage-count="sessionStorageCount"
    />
    <QuickActions
      :loading="loading"
      :count="currentCount"
      :mode="currentMode"
      @update:mode="currentMode = $event"
      @copy="handleCopy"
      @paste="handlePaste"
      @delete="handleDelete"
      @import="handleImport"
      @export="handleExport"
    />
    <button
      @click="openManager"
      class="w-full mt-4 py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
    >
      <span>🔧</span>
      <span>Open Manager</span>
    </button>
    <div v-if="message" :class="['mt-4 p-2 rounded text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookieStore } from '@/stores/cookieStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import { useSettingStore } from '@/stores/settingStore'
import { useLocalStorageStore } from '@/stores/localStorageStore'
import { useSessionStorageStore } from '@/stores/sessionStorageStore'
import { cookieManager } from '@/services/cookieManager'
import { storageService } from '@/services/storageService'
import type { CookieItem, StorageItem } from '@/types'
import StatusCard from './components/StatusCard.vue'
import QuickActions from './components/QuickActions.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()
const settingStore = useSettingStore()
const localStorageStore = useLocalStorageStore()
const sessionStorageStore = useSessionStorageStore()

const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const currentTabId = ref<number | null>(null)
const currentMode = ref<'cookies' | 'local' | 'session'>('cookies')

const currentDomain = computed(() => cookieStore.currentDomain)
const cookieCount = computed(() => cookieStore.cookieCount)
const localStorageCount = computed(() => localStorageStore.items.length)
const sessionStorageCount = computed(() => sessionStorageStore.items.length)

const currentCount = computed(() => {
  if (currentMode.value === 'cookies') return cookieCount.value
  if (currentMode.value === 'local') return localStorageCount.value
  return sessionStorageCount.value
})

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

async function init() {
  loading.value = true
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url && tab?.id) {
      currentTabId.value = tab.id
      const url = new URL(tab.url)
      await cookieStore.loadCookies(url.hostname)
      await localStorageStore.loadItems(tab.id, url.hostname)
      await sessionStorageStore.loadItems(tab.id, url.hostname)
    }
    await settingStore.load()
    
    const response = await chrome.runtime.sendMessage({ action: 'getClipboard' })
    if (response?.success && response?.data) {
      clipboardStore.items = response.data
    }
  } finally {
    loading.value = false
  }
}

async function handleCopy() {
  loading.value = true
  try {
    if (currentMode.value === 'cookies') {
      await clipboardStore.copyCookies(cookieStore.cookies, cookieStore.currentDomain)
      await chrome.runtime.sendMessage({ 
        action: 'setClipboard', 
        data: clipboardStore.items 
      })
      showMessage(`Copied ${cookieStore.cookieCount} cookies`)
    } else {
      const store = currentMode.value === 'local' ? localStorageStore : sessionStorageStore
      await chrome.runtime.sendMessage({ 
        action: 'setStorageClipboard', 
        storageType: currentMode.value,
        data: store.items 
      })
      showMessage(`Copied ${store.items.length} items`)
    }
  } catch { showMessage('Failed to copy', 'error') }
  finally { loading.value = false }
}

async function handlePaste() {
  loading.value = true
  try {
    if (currentMode.value === 'cookies') {
      let cookies: CookieItem[] | null = null
      cookies = await clipboardStore.pasteCookies(cookieStore.currentDomain)
      
      if (!cookies) {
        try {
          const clipboardText = await navigator.clipboard.readText()
          if (clipboardText) {
            const parsed = JSON.parse(clipboardText)
            if (Array.isArray(parsed)) {
              cookies = parsed
            } else if (parsed.name && parsed.value) {
              cookies = [parsed]
            }
          }
        } catch {}
      }
      
      if (!cookies) { 
        showMessage('No cookies to paste', 'error')
        return
      }
      
      const domain = cookieStore.currentDomain.replace(/^\./, '')
      for (const c of cookies) {
        if (!c.domain || c.domain === 'example.com') {
          c.domain = domain.startsWith('.') ? domain : '.' + domain
        }
      }
      
      await cookieManager.setCookies(cookies, `https://${domain}`)
      await cookieStore.loadCookies(cookieStore.currentDomain)
      showMessage(`Pasted ${cookies.length} cookies`)
    } else {
      if (!currentTabId.value) {
        showMessage('No active tab', 'error')
        return
      }
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'getStorageClipboard', 
        storageType: currentMode.value 
      })
      
      let items: StorageItem[] = response?.data || []
      
      if (items.length === 0) {
        try {
          const clipboardText = await navigator.clipboard.readText()
          if (clipboardText) {
            const parsed = JSON.parse(clipboardText)
            items = Array.isArray(parsed) ? parsed : [parsed]
          }
        } catch {}
      }
      
      if (items.length === 0) {
        showMessage('No items to paste', 'error')
        return
      }
      
      const store = currentMode.value === 'local' ? localStorageStore : sessionStorageStore
      await store.setItems(items)
      await store.loadItems(currentTabId.value, currentDomain.value)
      showMessage(`Pasted ${items.length} items`)
    }
  } catch (err) {
    console.error('Paste error:', err)
    showMessage(`Failed to paste: ${err}`, 'error')
  }
  finally { loading.value = false }
}

async function handleDelete() {
  loading.value = true
  try {
    if (currentMode.value === 'cookies') {
      await cookieStore.deleteAllCookies()
      showMessage('All cookies deleted')
    } else {
      if (!currentTabId.value) {
        showMessage('No active tab', 'error')
        return
      }
      
      const store = currentMode.value === 'local' ? localStorageStore : sessionStorageStore
      const keys = store.items.map(item => item.key)
      await store.removeItems(keys)
      showMessage('All items deleted')
    }
  } catch { showMessage('Failed to delete', 'error') }
  finally { loading.value = false }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    loading.value = true
    try {
      const text = await file.text()
      
      if (currentMode.value === 'cookies') {
        const cookies = await storageService.importCookies(text)
        await cookieManager.setCookies(cookies, `https://${cookieStore.currentDomain}`)
        await cookieStore.loadCookies(cookieStore.currentDomain)
        showMessage(`Imported ${cookies.length} cookies`)
      } else {
        const items: StorageItem[] = JSON.parse(text)
        if (!currentTabId.value) {
          showMessage('No active tab', 'error')
          return
        }
        const store = currentMode.value === 'local' ? localStorageStore : sessionStorageStore
        await store.setItems(Array.isArray(items) ? items : [items])
        await store.loadItems(currentTabId.value, currentDomain.value)
        const count = Array.isArray(items) ? items.length : 1
        showMessage(`Imported ${count} items`)
      }
    } catch { showMessage('Failed to import', 'error') }
    finally { loading.value = false }
  }
  input.click()
}

async function handleExport() {
  try {
    let json: string
    let filename: string
    
    if (currentMode.value === 'cookies') {
      json = await storageService.exportCookies(cookieStore.cookies)
      filename = `cookies-${cookieStore.currentDomain}-${Date.now()}.json`
    } else {
      const store = currentMode.value === 'local' ? localStorageStore : sessionStorageStore
      json = JSON.stringify(store.items, null, 2)
      filename = `${currentMode.value}-storage-${currentDomain.value}-${Date.now()}.json`
    }
    
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showMessage('Exported')
  } catch { showMessage('Failed to export', 'error') }
}

async function openManager() {
  const url = chrome.runtime.getURL('src/manager/index.html')
  const params = new URLSearchParams({ 
    domain: cookieStore.currentDomain
  })
  if (currentTabId.value) {
    params.set('tabId', String(currentTabId.value))
  }
  chrome.tabs.create({ url: `${url}?${params.toString()}` })
}

onMounted(init)
</script>
