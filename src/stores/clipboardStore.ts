import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CookieItem, ClipboardItem } from '@/types'
import { clipboardService } from '@/services/clipboardService'
import { storageService } from '@/services/storageService'
import { useSettingStore } from './settingStore'

export const useClipboardStore = defineStore('clipboard', () => {
  const items = ref<ClipboardItem[]>([])
  const activeIndex = ref(0)
  const persistMode = ref(false)

  const activeItem = computed(() => items.value[activeIndex.value] ?? null)
  const itemCount = computed(() => items.value.length)

  async function loadFromStorage(): Promise<void> {
    items.value = await storageService.getClipboard()
  }

  async function copyCookies(cookies: CookieItem[], sourceDomain: string, label?: string): Promise<void> {
    const settingStore = useSettingStore()
    const item = clipboardService.copy(cookies, sourceDomain, label)
    items.value.unshift(item)
    items.value = clipboardService.mergeClipboardItems(items.value, settingStore.maxClipboardItems)
    if (persistMode.value) {
      await storageService.saveClipboard(items.value)
    }
  }

  async function pasteCookies(targetDomain: string): Promise<CookieItem[] | null> {
    const item = activeItem.value
    const validation = clipboardService.validateForPaste(item)
    if (!validation.valid) return null
    return clipboardService.transformForDomain(item!.cookies, targetDomain)
  }

  function setActiveIndex(index: number): void {
    activeIndex.value = Math.max(0, Math.min(index, items.value.length - 1))
  }

  async function removeItem(index: number): Promise<void> {
    items.value.splice(index, 1)
    if (activeIndex.value >= items.value.length) {
      activeIndex.value = Math.max(0, items.value.length - 1)
    }
    if (persistMode.value) {
      await storageService.saveClipboard(items.value)
    }
  }

  async function clear(): Promise<void> {
    items.value = []
    activeIndex.value = 0
    await storageService.clearClipboard()
  }

  return {
    items, activeIndex, persistMode, activeItem, itemCount,
    loadFromStorage, copyCookies, pasteCookies, setActiveIndex, removeItem, clear
  }
})