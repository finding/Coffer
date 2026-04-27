import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '@/types'
import { storageService } from '@/services/storageService'

export const useSettingStore = defineStore('settings', () => {
  const persistMode = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const maxClipboardItems = ref(10)

  async function load(): Promise<void> {
    const settings = await storageService.getSettings()
    persistMode.value = settings.persistMode
    theme.value = settings.theme
    maxClipboardItems.value = settings.maxClipboardItems
  }

  async function save(): Promise<void> {
    await storageService.saveSettings({
      persistMode: persistMode.value,
      theme: theme.value,
      maxClipboardItems: maxClipboardItems.value
    })
  }

  function updateSettings(newSettings: Partial<Settings>): void {
    if (newSettings.persistMode !== undefined) persistMode.value = newSettings.persistMode
    if (newSettings.theme !== undefined) theme.value = newSettings.theme
    if (newSettings.maxClipboardItems !== undefined) maxClipboardItems.value = newSettings.maxClipboardItems
  }

  return { persistMode, theme, maxClipboardItems, load, save, updateSettings }
})