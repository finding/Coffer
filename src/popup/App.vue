<template>
  <div class="w-80 p-4 bg-gray-50 min-h-[400px]">
    <StatusCard :domain="currentDomain" :count="cookieCount" />
    <QuickActions
      :loading="loading"
      :has-clipboard="hasClipboardItems"
      :count="cookieCount"
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
      <span>Open Cookie Manager</span>
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
import { cookieManager } from '@/services/cookieManager'
import { storageService } from '@/services/storageService'
import type { CookieItem } from '@/types'
import StatusCard from './components/StatusCard.vue'
import QuickActions from './components/QuickActions.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()
const settingStore = useSettingStore()

const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const currentDomain = computed(() => cookieStore.currentDomain)
const cookieCount = computed(() => cookieStore.cookieCount)
const hasClipboardItems = computed(() => clipboardStore.itemCount > 0)

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
    if (tab?.url) {
      const url = new URL(tab.url)
      await cookieStore.loadCookies(url.hostname)
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
    await clipboardStore.copyCookies(cookieStore.cookies, cookieStore.currentDomain)
    await chrome.runtime.sendMessage({ 
      action: 'setClipboard', 
      data: clipboardStore.items 
    })
    showMessage(`Copied ${cookieStore.cookieCount} cookies`)
  } catch { showMessage('Failed to copy cookies', 'error') }
  finally { loading.value = false }
}

async function handlePaste() {
  loading.value = true
  try {
    let cookies: CookieItem[] | null = null
    
    // First try clipboardStore (from manager copy)
    cookies = await clipboardStore.pasteCookies(cookieStore.currentDomain)
    
    // If no cookies in clipboardStore, try system clipboard (JSON format)
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
      } catch {
        // Not valid JSON or clipboard read failed
      }
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
  } catch (err) {
    console.error('Paste error:', err)
    showMessage(`Failed to paste: ${err}`, 'error')
  }
  finally { loading.value = false }
}

async function handleDelete() {
  loading.value = true
  try {
    await cookieStore.deleteAllCookies()
    showMessage('All cookies deleted')
  } catch { showMessage('Failed to delete cookies', 'error') }
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
      const cookies = await storageService.importCookies(text)
      await cookieManager.setCookies(cookies, `https://${cookieStore.currentDomain}`)
      await cookieStore.loadCookies(cookieStore.currentDomain)
      showMessage(`Imported ${cookies.length} cookies`)
    } catch { showMessage('Failed to import cookies', 'error') }
    finally { loading.value = false }
  }
  input.click()
}

async function handleExport() {
  const json = await storageService.exportCookies(cookieStore.cookies)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cookies-${cookieStore.currentDomain}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('Cookies exported')
}

function openManager() {
  const url = chrome.runtime.getURL('src/manager/index.html')
  const params = new URLSearchParams({ domain: cookieStore.currentDomain })
  chrome.tabs.create({ url: `${url}?${params.toString()}` })
}

onMounted(init)
</script>
