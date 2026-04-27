<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <header class="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold">Cookie Manager</h1>
        <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {{ domainFilter || 'All domains' }}
        </span>
      </div>
      <div class="flex gap-2">
        <button @click="clearDomainFilter" v-if="domainFilter" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Show All</button>
        <button @click="showNewModal = true" class="px-3 py-1.5 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 text-sm">New Cookie</button>
        <button @click="showSettings = true" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Settings</button>
        <button @click="loadAllCookies" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Refresh</button>
      </div>
    </header>

    <FilterBar
      @update:keyword="handleKeywordUpdate"
      @update:attribute="handleAttributeUpdate"
    />

    <CookieList
      :cookies="filteredCookies"
      :selected="selectedCookies"
      @update:selected="selectedCookies = $event"
      @edit="handleEdit"
      @delete="handleDelete"
      @copy="handleSingleCopy"
    />

    <BatchActions
      :selected-count="selectedCookies.size"
      @copy="handleBatchCopy"
      @delete="handleBatchDelete"
      @export="handleBatchExport"
    />

    <CookieDetail
      v-if="showDetailModal"
      :cookie="editingCookie"
      :domain="currentDomain"
      @close="closeDetailModal"
      @save="handleSave"
    />

    <div v-if="showNewModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewModal = false">
      <CookieDetail
        :domain="currentDomain"
        @close="showNewModal = false"
        @save="handleSave"
      />
    </div>

    <div v-if="showSettings" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showSettings = false">
      <div class="bg-white rounded-lg shadow-xl w-[400px]">
        <SettingsPanel @close="showSettings = false" />
      </div>
    </div>

    <div v-if="message" :class="['fixed bottom-4 right-4 p-3 rounded-lg shadow-lg text-sm', messageClass]">
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
import FilterBar from '@/devtools/components/FilterBar.vue'
import CookieList from '@/devtools/components/CookieList.vue'
import CookieDetail from '@/devtools/components/CookieDetail.vue'
import BatchActions from '@/devtools/components/BatchActions.vue'
import SettingsPanel from '@/devtools/components/SettingsPanel.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()
const settingStore = useSettingStore()

const selectedCookies = ref<Set<CookieItem>>(new Set())
const editingCookie = ref<CookieItem | undefined>(undefined)
const showDetailModal = ref(false)
const showNewModal = ref(false)
const showSettings = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const keywordFilter = ref('')
const attributeFilter = ref('')
const domainFilter = ref('')

const currentDomain = computed(() => cookieStore.currentDomain || 'example.com')

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

const filteredCookies = computed(() => {
  let result = cookieStore.cookies
  if (domainFilter.value) {
    const df = domainFilter.value.toLowerCase().replace(/^\./, '')
    result = result.filter(c => {
      const cookieDomain = c.domain.toLowerCase().replace(/^\./, '')
      return cookieDomain === df || cookieDomain.endsWith('.' + df) || df.endsWith('.' + cookieDomain) || cookieDomain.includes(df)
    })
  }
  if (keywordFilter.value) {
    const kw = keywordFilter.value.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(kw) ||
      c.domain.toLowerCase().includes(kw) ||
      c.value.toLowerCase().includes(kw)
    )
  }
  if (attributeFilter.value) {
    if (attributeFilter.value === 'secure') result = result.filter(c => c.secure)
    else if (attributeFilter.value === 'httpOnly') result = result.filter(c => c.httpOnly)
    else if (attributeFilter.value === 'session') result = result.filter(c => !c.expirationDate)
  }
  return result
})

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

function handleKeywordUpdate(kw: string) { keywordFilter.value = kw }
function handleAttributeUpdate(attr: string) { attributeFilter.value = attr }
function clearDomainFilter() { domainFilter.value = '' }

function handleEdit(cookie: CookieItem) {
  editingCookie.value = cookie
  showDetailModal.value = true
}

async function handleDelete(cookie: CookieItem) {
  try {
    const url = `https://${cookie.domain}${cookie.path}`
    await cookieManager.removeCookie({ url, name: cookie.name })
    await loadAllCookies()
    showMessage('Cookie deleted')
  } catch {
    showMessage('Failed to delete cookie', 'error')
  }
}

function closeDetailModal() {
  showDetailModal.value = false
  editingCookie.value = undefined
}

async function handleSave(cookie: CookieItem) {
  try {
    const url = `https://${cookie.domain}${cookie.path}`
    await cookieManager.setCookie(cookie, url)
    await loadAllCookies()
    closeDetailModal()
    showNewModal.value = false
    showMessage('Cookie saved')
  } catch {
    showMessage('Failed to save cookie', 'error')
  }
}

async function handleBatchCopy() {
  try {
    const cookies = Array.from(selectedCookies.value)
    await clipboardStore.copyCookies(cookies, currentDomain.value)
    await chrome.runtime.sendMessage({ 
      action: 'setClipboard', 
      data: clipboardStore.items 
    })
    showMessage(`Copied ${cookies.length} cookies`)
    selectedCookies.value = new Set()
  } catch {
    showMessage('Failed to copy cookies', 'error')
  }
}

async function handleSingleCopy(cookie: CookieItem) {
  try {
    await clipboardStore.copyCookies([cookie], cookie.domain)
    await chrome.runtime.sendMessage({ 
      action: 'setClipboard', 
      data: clipboardStore.items 
    })
  } catch {
    showMessage('Failed to copy cookie', 'error')
  }
}

async function handleBatchDelete() {
  try {
    const cookies = Array.from(selectedCookies.value)
    for (const c of cookies) {
      const url = `https://${c.domain}${c.path}`
      await cookieManager.removeCookie({ url, name: c.name })
    }
    await loadAllCookies()
    showMessage(`Deleted ${cookies.length} cookies`)
    selectedCookies.value = new Set()
  } catch {
    showMessage('Failed to delete cookies', 'error')
  }
}

async function handleBatchExport() {
  try {
    const cookies = Array.from(selectedCookies.value)
    const json = await storageService.exportCookies(cookies)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cookies-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage('Cookies exported')
    selectedCookies.value = new Set()
  } catch {
    showMessage('Failed to export cookies', 'error')
  }
}

async function loadAllCookies() {
  try {
    const allCookies = await cookieManager.getCookies({})
    cookieStore.cookies = allCookies
  } catch {
    showMessage('Failed to load cookies', 'error')
  }
}

async function init() {
  await settingStore.load()
  const response = await chrome.runtime.sendMessage({ action: 'getClipboard' })
  if (response?.success && response?.data) {
    clipboardStore.items = response.data
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  const domain = urlParams.get('domain')
  if (domain) {
    cookieStore.currentDomain = domain
    domainFilter.value = domain
  }
  
  await loadAllCookies()
}

onMounted(init)
</script>