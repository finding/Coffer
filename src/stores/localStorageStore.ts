import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StorageItem } from '@/types'
import { storageDataManager } from '@/services/storageDataManager'

export const useLocalStorageStore = defineStore('localStorage', () => {
  const items = ref<StorageItem[]>([])
  const currentTabId = ref<number | null>(null)
  const currentDomain = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const keywordFilter = ref('')

  const filteredItems = computed(() => {
    if (!keywordFilter.value) return items.value
    return storageDataManager.filterByKeyword(items.value, keywordFilter.value)
  })

  const itemCount = computed(() => items.value.length)

  async function loadItems(tabId: number, domain: string): Promise<void> {
    loading.value = true
    error.value = null
    currentTabId.value = tabId
    currentDomain.value = domain
    try {
      console.log('[LocalStorageStore] Getting storage for tabId:', tabId)
      items.value = await storageDataManager.getStorage(tabId, 'local')
      console.log('[LocalStorageStore] Got items:', items.value.length, items.value)
    } catch (e) {
      console.error('[LocalStorageStore] Error:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load localStorage'
    } finally {
      loading.value = false
    }
  }

  async function setItem(key: string, value: string): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.setItem(currentTabId.value, 'local', key, value)
    await loadItems(currentTabId.value, currentDomain.value)
  }

  async function removeItem(key: string): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.removeItem(currentTabId.value, 'local', key)
    items.value = items.value.filter(item => item.key !== key)
  }

  async function removeItems(keys: string[]): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.removeItems(currentTabId.value, 'local', keys)
    items.value = items.value.filter(item => !keys.includes(item.key))
  }

  async function setItems(newItems: StorageItem[]): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.setItems(currentTabId.value, 'local', newItems)
    await loadItems(currentTabId.value, currentDomain.value)
  }

  return {
    items, currentTabId, currentDomain, loading, error, keywordFilter,
    filteredItems, itemCount,
    loadItems, setItem, removeItem, removeItems, setItems
  }
})
