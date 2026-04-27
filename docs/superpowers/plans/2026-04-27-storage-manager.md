# Storage Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add localStorage and sessionStorage management to existing Cookie Manager extension with Tab navigation.

**Architecture:** Reuse existing Cookie Manager UI patterns. Add Tab navigation to Manager page. Use Content Script injection to access page's localStorage/sessionStorage.

**Tech Stack:** Vue 3, Pinia, Chrome Extension MV3, Content Script injection

---

## File Structure

```
src/
├── services/
│   └── storageDataManager.ts    # NEW: Storage operations via content script
├── stores/
│   ├── localStorageStore.ts     # NEW: localStorage Pinia store
│   └── sessionStorageStore.ts   # NEW: sessionStorage Pinia store
├── devtools/components/
│   ├── StorageList.vue          # NEW: Storage list component
│   └── StorageDetail.vue        # NEW: Edit storage modal
├── manager/components/
│   ├── TabNav.vue               # NEW: Tab navigation
│   └── StoragePanel.vue         # NEW: Storage management panel
├── content/
│   └── storage.ts               # NEW: Content script
└── types/
    └── index.ts                 # MODIFY: Add StorageItem types
```

---

## Task 1: Add Types and Permissions

**Files:**
- Modify: `src/types/index.ts`
- Modify: `manifest.json`

- [ ] **Step 1: Add Storage types to types/index.ts**

Add to existing types file:

```typescript
export interface StorageItem {
  key: string
  value: string
}

export interface StorageClipboardItem {
  items: StorageItem[]
  sourceDomain: string
  storageType: 'local' | 'session'
  copiedAt: number
}
```

- [ ] **Step 2: Add scripting permission to manifest.json**

Update permissions array to include "scripting":

```json
"permissions": ["cookies", "storage", "activeTab", "tabs", "scripting"],
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts manifest.json
git commit -m "feat: add storage types and scripting permission"
```

---

## Task 2: Implement StorageDataManager Service

**Files:**
- Create: `src/services/storageDataManager.ts`

- [ ] **Step 1: Create storageDataManager.ts**

```typescript
import type { StorageItem } from '@/types'

export class StorageDataManager {
  async getStorage(tabId: number, type: 'local' | 'session'): Promise<StorageItem[]> {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType: string) => {
        const storage = storageType === 'local' ? localStorage : sessionStorage
        const items: { key: string; value: string }[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key) {
            items.push({ key, value: storage.getItem(key) || '' })
          }
        }
        return items
      },
      args: [type]
    })
    return result[0].result || []
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/storageDataManager.ts
git commit -m "feat: implement StorageDataManager service"
```

---

## Task 3: Implement Pinia Stores

**Files:**
- Create: `src/stores/localStorageStore.ts`
- Create: `src/stores/sessionStorageStore.ts`

- [ ] **Step 1: Create localStorageStore.ts**

```typescript
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
      items.value = await storageDataManager.getStorage(tabId, 'local')
    } catch (e) {
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
```

- [ ] **Step 2: Create sessionStorageStore.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StorageItem } from '@/types'
import { storageDataManager } from '@/services/storageDataManager'

export const useSessionStorageStore = defineStore('sessionStorage', () => {
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
      items.value = await storageDataManager.getStorage(tabId, 'session')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load sessionStorage'
    } finally {
      loading.value = false
    }
  }

  async function setItem(key: string, value: string): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.setItem(currentTabId.value, 'session', key, value)
    await loadItems(currentTabId.value, currentDomain.value)
  }

  async function removeItem(key: string): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.removeItem(currentTabId.value, 'session', key)
    items.value = items.value.filter(item => item.key !== key)
  }

  async function removeItems(keys: string[]): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.removeItems(currentTabId.value, 'session', keys)
    items.value = items.value.filter(item => !keys.includes(item.key))
  }

  async function setItems(newItems: StorageItem[]): Promise<void> {
    if (!currentTabId.value) return
    await storageDataManager.setItems(currentTabId.value, 'session', newItems)
    await loadItems(currentTabId.value, currentDomain.value)
  }

  return {
    items, currentTabId, currentDomain, loading, error, keywordFilter,
    filteredItems, itemCount,
    loadItems, setItem, removeItem, removeItems, setItems
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/localStorageStore.ts src/stores/sessionStorageStore.ts
git commit -m "feat: implement localStorage and sessionStorage Pinia stores"
```

---

## Task 4: Implement UI Components

**Files:**
- Create: `src/devtools/components/StorageList.vue`
- Create: `src/devtools/components/StorageDetail.vue`
- Create: `src/manager/components/TabNav.vue`

- [ ] **Step 1: Create StorageList.vue**

```vue
<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="w-8 p-2"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th class="text-left p-2">Key</th>
          <th class="text-left p-2">Value</th>
          <th class="text-center p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.key"
          class="border-b hover:bg-gray-50" :class="{ 'bg-blue-50': selected.has(item.key) }">
          <td class="p-2"><input type="checkbox" :checked="selected.has(item.key)" @change="toggleSelect(item)" /></td>
          <td class="p-2">
            <div @click="copyItem(item)" class="group flex items-center gap-1 cursor-pointer" :title="item.key">
              <span class="font-mono text-xs truncate max-w-[150px] group-hover:text-chrome-blue group-hover:underline">{{ item.key }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2">
            <div @click="copyItem(item)" class="group flex items-center gap-1 cursor-pointer" :title="item.value">
              <span class="font-mono text-xs truncate max-w-[200px] group-hover:text-chrome-blue group-hover:underline">{{ item.value }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2 text-center">
            <button @click="$emit('edit', item)" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Edit</button>
            <button @click="$emit('delete', item)" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 ml-1">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="items.length === 0" class="p-8 text-center text-gray-500">No items found</div>
    <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="copied" class="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm shadow-lg">Copied!</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StorageItem } from '@/types'

const props = defineProps<{ items: StorageItem[]; selected: Set<string> }>()
const emit = defineEmits<{ 'update:selected': [Set<string>]; 'edit': [StorageItem]; 'delete': [StorageItem]; 'copy': [StorageItem] }>()

const copied = ref(false)

const allSelected = computed(() => props.items.length > 0 && props.items.every(i => props.selected.has(i.key)))

function toggleSelectAll() {
  const newSelected = new Set(props.selected)
  if (allSelected.value) props.items.forEach(i => newSelected.delete(i.key))
  else props.items.forEach(i => newSelected.add(i.key))
  emit('update:selected', newSelected)
}

function toggleSelect(item: StorageItem) {
  const newSelected = new Set(props.selected)
  if (newSelected.has(item.key)) newSelected.delete(item.key)
  else newSelected.add(item.key)
  emit('update:selected', newSelected)
}

async function copyItem(item: StorageItem) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(item, null, 2))
    emit('copy', item)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>
```

- [ ] **Step 2: Create StorageDetail.vue**

```vue
<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-semibold">{{ isNew ? 'New Item' : 'Edit Item' }}</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Key</label>
          <input v-model="form.key" type="text" required class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Value</label>
          <textarea v-model="form.value" required rows="5" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="$emit('close')" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-chrome-blue text-white rounded-lg hover:bg-blue-600">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StorageItem } from '@/types'

const props = defineProps<{ item?: StorageItem }>()
const emit = defineEmits<{ close: []; save: [StorageItem] }>()

const isNew = !props.item
const form = ref<StorageItem>({ key: '', value: '', ...props.item })

watch(() => props.item, (i) => { if (i) form.value = { ...i } }, { immediate: true })

function handleSubmit() { emit('save', form.value) }
</script>
```

- [ ] **Step 3: Create TabNav.vue**

```vue
<template>
  <div class="flex border-b bg-white">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      @click="$emit('update:active', tab.id)"
      :class="[
        'px-4 py-2 text-sm font-medium transition-colors',
        active === tab.id
          ? 'border-b-2 border-chrome-blue text-chrome-blue'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      ]"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ active: string }>()
defineEmits<{ 'update:active': [string] }>()

const tabs = [
  { id: 'cookies', label: 'Cookies' },
  { id: 'localStorage', label: 'LocalStorage' },
  { id: 'sessionStorage', label: 'SessionStorage' }
]
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/devtools/components/StorageList.vue src/devtools/components/StorageDetail.vue src/manager/components/TabNav.vue
git commit -m "feat: implement Storage UI components and TabNav"
```

---

## Task 5: Integrate into Manager Page

**Files:**
- Modify: `src/manager/App.vue`

- [ ] **Step 1: Update Manager App.vue to add Tab navigation and Storage panels**

Replace the existing template and script to add:
1. TabNav component at top
2. Conditional rendering for Cookies/LocalStorage/SessionStorage panels
3. Storage clipboard handling

Key changes:
- Import TabNav, StorageList, StorageDetail
- Import localStorageStore, sessionStorageStore
- Add activeTab ref
- Add Storage-related handlers (handleStorageCopy, handleStoragePaste, etc.)

- [ ] **Step 2: Rebuild and test**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/manager/App.vue
git commit -m "feat: integrate Storage management into Manager page with Tab navigation"
```

---

## Task 6: Final Testing

- [ ] **Step 1: Test in Chrome**

1. Load extension in Chrome
2. Open Manager page
3. Verify Tab navigation works
4. Test localStorage CRUD operations
5. Test sessionStorage CRUD operations
6. Test copy/paste functionality
7. Test cross-domain paste

- [ ] **Step 2: Final commit**

```bash
git add .
git commit -m "chore: final testing and verification"
```
