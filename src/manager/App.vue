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
        <button @click="handleNew" class="px-3 py-1.5 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 text-sm">{{ newButtonLabel }}</button>
        <button @click="showSettings = true" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Settings</button>
        <button @click="handleRefresh" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Refresh</button>
      </div>
    </header>

    <TabNav v-model:active="activeTab" :counts="tabCounts" />

    <template v-if="activeTab === 'cookies'">
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
    </template>

    <template v-else-if="activeTab === 'local'">
      <StorageList
        :items="localStorageStore.filteredItems"
        :selected="selectedLocalStorageItems"
        @update:selected="selectedLocalStorageItems = $event"
        @edit="handleStorageEdit('local', $event)"
        @delete="handleStorageDelete('local', $event)"
        @copy="handleStorageSingleCopy('local', $event)"
      />

      <BatchActions
        :selected-count="selectedLocalStorageItems.size"
        @copy="handleStorageBatchCopy('local')"
        @delete="handleStorageBatchDelete('local')"
        @export="handleStorageBatchExport('local')"
      />
    </template>

    <template v-else-if="activeTab === 'session'">
      <StorageList
        :items="sessionStorageStore.filteredItems"
        :selected="selectedSessionStorageItems"
        @update:selected="selectedSessionStorageItems = $event"
        @edit="handleStorageEdit('session', $event)"
        @delete="handleStorageDelete('session', $event)"
        @copy="handleStorageSingleCopy('session', $event)"
      />

      <BatchActions
        :selected-count="selectedSessionStorageItems.size"
        @copy="handleStorageBatchCopy('session')"
        @delete="handleStorageBatchDelete('session')"
        @export="handleStorageBatchExport('session')"
      />
    </template>

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

    <StorageDetail
      v-if="showStorageDetail"
      :item="editingStorageItem"
      @close="closeStorageDetail"
      @save="handleStorageSave"
    />

    <div v-if="showNewStorageModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewStorageModal = false">
      <StorageDetail
        @close="showNewStorageModal = false"
        @save="handleStorageSave"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useCookieStore } from '@/stores/cookieStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import { useSettingStore } from '@/stores/settingStore'
import { useLocalStorageStore } from '@/stores/localStorageStore'
import { useSessionStorageStore } from '@/stores/sessionStorageStore'
import { cookieManager } from '@/services/cookieManager'
import { storageService } from '@/services/storageService'
import type { CookieItem, StorageItem } from '@/types'
import FilterBar from '@/devtools/components/FilterBar.vue'
import CookieList from '@/devtools/components/CookieList.vue'
import CookieDetail from '@/devtools/components/CookieDetail.vue'
import BatchActions from '@/devtools/components/BatchActions.vue'
import SettingsPanel from '@/devtools/components/SettingsPanel.vue'
import TabNav from '@/manager/components/TabNav.vue'
import StorageList from '@/devtools/components/StorageList.vue'
import StorageDetail from '@/devtools/components/StorageDetail.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()
const settingStore = useSettingStore()
const localStorageStore = useLocalStorageStore()
const sessionStorageStore = useSessionStorageStore()

const activeTab = ref<'cookies' | 'local' | 'session'>('cookies')
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

const selectedLocalStorageItems = ref<Set<StorageItem>>(new Set())
const selectedSessionStorageItems = ref<Set<StorageItem>>(new Set())
const editingStorageItem = ref<StorageItem | undefined>(undefined)
const showStorageDetail = ref(false)
const showNewStorageModal = ref(false)
const currentStorageType = ref<'local' | 'session'>('local')

const currentDomain = computed(() => cookieStore.currentDomain || 'example.com')

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

const newButtonLabel = computed(() => {
  if (activeTab.value === 'cookies') return 'New Cookie'
  if (activeTab.value === 'local') return 'New Item'
  return 'New Item'
})

const tabCounts = computed(() => ({
  cookies: cookieStore.cookies.length,
  local: localStorageStore.items.length,
  session: sessionStorageStore.items.length
}))

const filteredCookies = computed(() => {
  let result = cookieStore.cookies
  if (domainFilter.value) {
    const df = domainFilter.value.toLowerCase().replace(/^\./, '')
    result = result.filter(c => {
      const cd = c.domain.toLowerCase().replace(/^\./, '')
      if (cd === df) return true
      if (cd.endsWith('.' + df)) return true
      if (df.endsWith('.' + cd)) return true
      const dfParts = df.split('.')
      const cdParts = cd.split('.')
      if (dfParts.length >= 2 && cdParts.length >= 2) {
        const dfRoot = dfParts.slice(-2).join('.')
        const cdRoot = cdParts.slice(-2).join('.')
        if (dfRoot === cdRoot) return true
      }
      return false
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

function handleNew() {
  if (activeTab.value === 'cookies') {
    showNewModal.value = true
  } else {
    currentStorageType.value = activeTab.value as 'local' | 'session'
    showNewStorageModal.value = true
  }
}

async function handleRefresh() {
  if (activeTab.value === 'cookies') {
    await loadAllCookies()
  } else if (activeTab.value === 'local') {
    const tabId = localStorageStore.currentTabId
    if (tabId) await localStorageStore.loadItems(tabId, localStorageStore.currentDomain)
  } else {
    const tabId = sessionStorageStore.currentTabId
    if (tabId) await sessionStorageStore.loadItems(tabId, sessionStorageStore.currentDomain)
  }
}

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

function handleStorageEdit(type: 'local' | 'session', item: StorageItem) {
  currentStorageType.value = type
  editingStorageItem.value = item
  showStorageDetail.value = true
}

async function handleStorageDelete(type: 'local' | 'session', item: StorageItem) {
  try {
    if (type === 'local') {
      await localStorageStore.removeItem(item.key)
    } else {
      await sessionStorageStore.removeItem(item.key)
    }
    showMessage('Item deleted')
  } catch {
    showMessage('Failed to delete item', 'error')
  }
}

function closeStorageDetail() {
  showStorageDetail.value = false
  editingStorageItem.value = undefined
}

async function handleStorageSave(item: StorageItem) {
  try {
    if (currentStorageType.value === 'local') {
      await localStorageStore.setItem(item.key, item.value)
    } else {
      await sessionStorageStore.setItem(item.key, item.value)
    }
    closeStorageDetail()
    showNewStorageModal.value = false
    showMessage('Item saved')
  } catch {
    showMessage('Failed to save item', 'error')
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

async function handleStorageSingleCopy(_type: 'local' | 'session', item: StorageItem) {
  try {
    await navigator.clipboard.writeText(`${item.key}=${item.value}`)
    showMessage('Copied to clipboard')
  } catch {
    showMessage('Failed to copy item', 'error')
  }
}

async function handleStorageBatchCopy(type: 'local' | 'session') {
  try {
    const items = Array.from(type === 'local' ? selectedLocalStorageItems.value : selectedSessionStorageItems.value)
    const text = items.map(i => `${i.key}=${i.value}`).join('\n')
    await navigator.clipboard.writeText(text)
    showMessage(`Copied ${items.length} items`)
    if (type === 'local') selectedLocalStorageItems.value = new Set()
    else selectedSessionStorageItems.value = new Set()
  } catch {
    showMessage('Failed to copy items', 'error')
  }
}

async function handleStorageBatchDelete(type: 'local' | 'session') {
  try {
    const items = Array.from(type === 'local' ? selectedLocalStorageItems.value : selectedSessionStorageItems.value)
    const keys = items.map(i => i.key)
    if (type === 'local') {
      await localStorageStore.removeItems(keys)
    } else {
      await sessionStorageStore.removeItems(keys)
    }
    showMessage(`Deleted ${items.length} items`)
    if (type === 'local') selectedLocalStorageItems.value = new Set()
    else selectedSessionStorageItems.value = new Set()
  } catch {
    showMessage('Failed to delete items', 'error')
  }
}

async function handleStorageBatchExport(type: 'local' | 'session') {
  try {
    const items = Array.from(type === 'local' ? selectedLocalStorageItems.value : selectedSessionStorageItems.value)
    const json = JSON.stringify(items, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-storage-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage('Items exported')
    if (type === 'local') selectedLocalStorageItems.value = new Set()
    else selectedSessionStorageItems.value = new Set()
  } catch {
    showMessage('Failed to export items', 'error')
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

async function loadStorageForDomain(tabId: number | null, domain: string) {
  if (!tabId) return
  await Promise.all([
    localStorageStore.loadItems(tabId, domain),
    sessionStorageStore.loadItems(tabId, domain)
  ])
}

watch(activeTab, async (newTab) => {
  if (newTab === 'local' || newTab === 'session') {
    const tabId = localStorageStore.currentTabId || sessionStorageStore.currentTabId
    const domain = domainFilter.value || localStorageStore.currentDomain || sessionStorageStore.currentDomain
    if (tabId && domain) {
      await loadStorageForDomain(tabId, domain)
    }
  }
})

async function init() {
  await settingStore.load()
  const response = await chrome.runtime.sendMessage({ action: 'getClipboard' })
  if (response?.success && response?.data) {
    clipboardStore.items = response.data
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  const domain = urlParams.get('domain')
  const tabIdStr = urlParams.get('tabId')
  
  if (domain) {
    cookieStore.currentDomain = domain
    domainFilter.value = domain
  }
  
  await loadAllCookies()
  
  let tabId: number | null = null
  
  if (tabIdStr && tabIdStr !== 'null' && tabIdStr !== 'undefined') {
    const parsed = parseInt(tabIdStr, 10)
    if (!isNaN(parsed)) {
      tabId = parsed
    }
  }
  
  if (!tabId && domain) {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.url && tab.id) {
        try {
          const tabUrl = new URL(tab.url)
          if (tabUrl.hostname === domain || tabUrl.hostname.endsWith('.' + domain) || domain.endsWith('.' + tabUrl.hostname)) {
            tabId = tab.id
            break
          }
        } catch {}
      }
    }
  }
  
  if (tabId && domain) {
    await loadStorageForDomain(tabId, domain)
  }
}

onMounted(init)
</script>
