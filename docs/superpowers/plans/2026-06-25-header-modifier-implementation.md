# Header Modifier 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Coffer 扩展添加请求头和响应头修改功能，支持 Profile 配置文件管理和 URL 匹配规则。

**Architecture:** 使用 declarativeNetRequest API 处理 header 修改，Pinia 管理状态，在三个入口（popup、manager、devtools）提供 UI 操作界面。

**Tech Stack:** Vue 3 + TypeScript + Pinia + Tailwind CSS + Chrome Extension Manifest V3 + declarativeNetRequest API

## Global Constraints

- Chrome Extension Manifest V3
- 使用 declarativeNetRequest API（符合 MV3 规范）
- 规则数量限制：单次最多注册 5000 条规则（Chrome 默认限制）
- 数据持久化：chrome.storage.local
- 遵循现有代码风格和目录结构

---

## File Structure

```
src/
├── types/
│   ├── index.ts                    # 修改：导出 headerRule 类型
│   └── headerRule.ts               # 新增：Header 相关类型定义
├── services/
│   ├── headerRuleService.ts        # 新增：Header 规则管理服务
│   └── headerRuleStorage.ts        # 新增：Header 规则存储服务
├── stores/
│   └── headerRuleStore.ts          # 新增：Pinia 状态管理
├── background/
│   └── index.ts                    # 修改：添加 header 规则消息处理
├── popup/
│   ├── App.vue                     # 修改：添加 Headers tab
│   └── components/
│       └── HeadersTab.vue           # 新增：Popup Headers 组件
├── manager/
│   ├── App.vue                     # 修改：添加 Headers tab
│   └── components/
│       ├── TabNav.vue              # 修改：添加 headers tab 选项
│       └── HeadersManager.vue      # 新增：Manager Headers 组件
└── devtools/
    ├── App.vue                     # 修改：添加 Headers 面板选项
    └── components/
        └── HeadersPanel.vue        # 新增：DevTools Headers 组件
```

---

### Task 1: 类型定义和权限配置

**Files:**
- Create: `src/types/headerRule.ts`
- Modify: `src/types/index.ts`
- Modify: `manifest.json`

**Interfaces:**
- Produces: `HeaderRule`, `HeaderProfile`, `HttpMethod`, `HeaderTarget`, `HeaderAction`

- [ ] **Step 1: 创建 headerRule.ts 类型文件**

```typescript
// src/types/headerRule.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'

export type HeaderTarget = 'request' | 'response'

export type HeaderAction = 'add' | 'modify' | 'remove'

export interface HeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: HeaderAction
  headerName: string
  headerValue: string
  target: HeaderTarget
}

export interface HeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: HeaderRule[]
}

export interface HeaderProfilesExport {
  version: string
  profiles: HeaderProfile[]
}
```

- [ ] **Step 2: 更新 src/types/index.ts 导出**

在文件末尾添加：

```typescript
export * from './headerRule'
```

- [ ] **Step 3: 更新 MessagePayload 类型**

在 `src/types/index.ts` 的 `MessagePayload` 接口的 action 联合类型中添加：

```typescript
| 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles'
```

并在接口中添加相关字段：

```typescript
profiles?: HeaderProfile[]
profileId?: string
ruleId?: string
profileData?: HeaderProfile
jsonString?: string
```

- [ ] **Step 4: 更新 manifest.json 添加权限**

在 `permissions` 数组中添加：

```json
"declarativeNetRequest",
"declarativeNetRequestFeedback"
```

- [ ] **Step 5: 提交**

```bash
git add src/types/headerRule.ts src/types/index.ts manifest.json
git commit -m "feat: add header rule types and permissions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Header 规则存储服务

**Files:**
- Create: `src/services/headerRuleStorage.ts`

**Interfaces:**
- Consumes: `HeaderProfile` from Task 1
- Produces: `getProfiles()`, `saveProfiles()`, `getActiveProfile()`, `setActiveProfile()`

- [ ] **Step 1: 创建 headerRuleStorage.ts**

```typescript
// src/services/headerRuleStorage.ts

import type { HeaderProfile } from '@/types'

const PROFILES_KEY = 'headerProfiles'
const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'

const DEFAULT_PROFILE: HeaderProfile = {
  id: 'default',
  name: 'Default',
  enabled: true,
  rules: []
}

export class HeaderRuleStorage {
  async getProfiles(): Promise<HeaderProfile[]> {
    const result = await chrome.storage.local.get(PROFILES_KEY)
    return result[PROFILES_KEY] ?? [DEFAULT_PROFILE]
  }

  async saveProfiles(profiles: HeaderProfile[]): Promise<void> {
    await chrome.storage.local.set({ [PROFILES_KEY]: profiles })
  }

  async getActiveProfileId(): Promise<string | null> {
    const result = await chrome.storage.local.get(ACTIVE_PROFILE_KEY)
    return result[ACTIVE_PROFILE_KEY] ?? null
  }

  async setActiveProfileId(profileId: string | null): Promise<void> {
    if (profileId) {
      await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: profileId })
    } else {
      await chrome.storage.local.remove(ACTIVE_PROFILE_KEY)
    }
  }

  async getActiveProfile(): Promise<HeaderProfile | null> {
    const profiles = await this.getProfiles()
    const activeId = await this.getActiveProfileId()
    return profiles.find(p => p.id === activeId) ?? null
  }
}

export const headerRuleStorage = new HeaderRuleStorage()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/headerRuleStorage.ts
git commit -m "feat: add header rule storage service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Header 规则核心服务

**Files:**
- Create: `src/services/headerRuleService.ts`

**Interfaces:**
- Consumes: `HeaderRule`, `HeaderProfile`, `headerRuleStorage`
- Produces: `syncRulesToChrome()`, `convertToChromeRules()`, `clearAllRules()`

- [ ] **Step 1: 创建 headerRuleService.ts**

```typescript
// src/services/headerRuleService.ts

import type { HeaderRule, HeaderProfile } from '@/types'
import { headerRuleStorage } from './headerRuleStorage'

export class HeaderRuleService {
  private ruleIdCounter = 1

  async syncRulesToChrome(profile: HeaderProfile | null): Promise<void> {
    await this.clearAllRules()
    
    if (!profile || !profile.enabled) return
    
    const enabledRules = profile.rules.filter(r => r.enabled)
    const chromeRules = this.convertToChromeRules(enabledRules)
    
    if (chromeRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: chromeRules
      })
    }
  }

  convertToChromeRules(rules: HeaderRule[]): chrome.declarativeNetRequest.Rule[] {
    return rules.map((rule, index) => this.convertSingleRule(rule, index))
  }

  private convertSingleRule(rule: HeaderRule, index: number): chrome.declarativeNetRequest.Rule {
    const chromeRuleId = this.ruleIdCounter++
    
    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
      header: rule.headerName,
      operation: this.getOperation(rule.action),
      value: rule.action !== 'remove' ? rule.headerValue : undefined
    }

    const requestMethods = rule.methods.includes('ALL') 
      ? undefined 
      : rule.methods.map(m => m.toLowerCase() as chrome.declarativeNetRequest.RequestMethod)

    return {
      id: chromeRuleId,
      priority: 1000 - index,
      action: {
        type: rule.action === 'remove' ? 'removeHeaders' : 'modifyHeaders',
        requestHeaders: rule.target === 'request' ? [headerInfo] : undefined,
        responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
      },
      condition: {
        urlFilter: rule.urlPattern,
        requestMethods,
        resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'document', 'other']
      }
    }
  }

  private getOperation(action: 'add' | 'modify' | 'remove'): chrome.declarativeNetRequest.HeaderOperation {
    switch (action) {
      case 'add': return 'append'
      case 'modify': return 'set'
      case 'remove': return 'remove'
    }
  }

  async clearAllRules(): Promise<void> {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(r => r.id)
      })
    }
    this.ruleIdCounter = 1
  }

  async initialize(): Promise<void> {
    const activeProfile = await headerRuleStorage.getActiveProfile()
    if (activeProfile) {
      await this.syncRulesToChrome(activeProfile)
    }
  }
}

export const headerRuleService = new HeaderRuleService()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/headerRuleService.ts
git commit -m "feat: add header rule service with Chrome API sync

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Pinia Store 实现

**Files:**
- Create: `src/stores/headerRuleStore.ts`

**Interfaces:**
- Consumes: `HeaderProfile`, `headerRuleStorage`, `headerRuleService`
- Produces: `profiles`, `activeProfileId`, CRUD 方法

- [ ] **Step 1: 创建 headerRuleStore.ts**

```typescript
// src/stores/headerRuleStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HeaderProfile, HeaderRule } from '@/types'
import { headerRuleStorage } from '@/services/headerRuleStorage'
import { headerRuleService } from '@/services/headerRuleService'

export const useHeaderRuleStore = defineStore('headerRules', () => {
  const profiles = ref<HeaderProfile[]>([])
  const activeProfileId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProfile = computed(() => 
    profiles.value.find(p => p.id === activeProfileId.value) ?? null
  )

  async function loadProfiles(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      profiles.value = await headerRuleStorage.getProfiles()
      activeProfileId.value = await headerRuleStorage.getActiveProfileId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
    } finally {
      loading.value = false
    }
  }

  async function saveProfiles(): Promise<void> {
    await headerRuleStorage.saveProfiles(profiles.value)
  }

  async function setActiveProfile(profileId: string | null): Promise<void> {
    activeProfileId.value = profileId
    await headerRuleStorage.setActiveProfileId(profileId)
    
    const profile = profiles.value.find(p => p.id === profileId) ?? null
    await headerRuleService.syncRulesToChrome(profile)
  }

  async function createProfile(name: string): Promise<HeaderProfile> {
    const profile: HeaderProfile = {
      id: `profile-${Date.now()}`,
      name,
      enabled: true,
      rules: []
    }
    profiles.value.push(profile)
    await saveProfiles()
    return profile
  }

  async function updateProfile(profileId: string, updates: Partial<HeaderProfile>): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value[index] = { ...profiles.value[index], ...updates }
      await saveProfiles()
      
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profiles.value[index])
      }
    }
  }

  async function deleteProfile(profileId: string): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value.splice(index, 1)
      await saveProfiles()
      
      if (activeProfileId.value === profileId) {
        await setActiveProfile(null)
      }
    }
  }

  async function addRule(profileId: string, rule: HeaderRule): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules.push(rule)
      await saveProfiles()
      
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    }
  }

  async function updateRule(profileId: string, ruleId: string, updates: Partial<HeaderRule>): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const index = profile.rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        profile.rules[index] = { ...profile.rules[index], ...updates }
        await saveProfiles()
        
        if (activeProfileId.value === profileId) {
          await headerRuleService.syncRulesToChrome(profile)
        }
      }
    }
  }

  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules = profile.rules.filter(r => r.id !== ruleId)
      await saveProfiles()
      
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    }
  }

  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const reorderedRules: HeaderRule[] = []
      for (const id of ruleIds) {
        const rule = profile.rules.find(r => r.id === id)
        if (rule) reorderedRules.push(rule)
      }
      profile.rules = reorderedRules
      await saveProfiles()
      
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    }
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    loading,
    error,
    loadProfiles,
    saveProfiles,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    addRule,
    updateRule,
    deleteRule,
    reorderRules
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/headerRuleStore.ts
git commit -m "feat: add header rule Pinia store

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Background Service Worker 更新

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `headerRuleStorage`, `headerRuleService`, `MessagePayload`

- [ ] **Step 1: 添加 header 规则初始化**

在 `chrome.runtime.onInstalled.addListener` 回调中添加：

```typescript
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Coffer installed')
  await headerRuleService.initialize()
})
```

- [ ] **Step 2: 添加 header 规则消息处理**

在 `handleMessage` 函数的 switch 语句中添加 cases：

```typescript
case 'getHeaderProfiles':
  return { success: true, data: await headerRuleStorage.getProfiles() }

case 'setHeaderProfiles':
  await headerRuleStorage.saveProfiles(message.profiles as HeaderProfile[])
  return { success: true }

case 'syncHeaderRules':
  const profile = message.profileData as HeaderProfile | null
  await headerRuleService.syncRulesToChrome(profile)
  return { success: true }

case 'exportHeaderProfiles':
  const exportProfiles = await headerRuleStorage.getProfiles()
  return { success: true, data: JSON.stringify({ version: '1.0', profiles: exportProfiles }, null, 2) }

case 'importHeaderProfiles':
  try {
    const parsed = JSON.parse(message.jsonString as string)
    if (parsed.version && Array.isArray(parsed.profiles)) {
      await headerRuleStorage.saveProfiles(parsed.profiles)
      return { success: true }
    }
    return { success: false, error: 'Invalid format' }
  } catch {
    return { success: false, error: 'Parse error' }
  }
```

- [ ] **Step 3: 添加顶部导入**

在文件顶部添加：

```typescript
import { headerRuleStorage } from '@/services/headerRuleStorage'
import { headerRuleService } from '@/services/headerRuleService'
import type { HeaderProfile } from '@/types'
```

- [ ] **Step 4: 提交**

```bash
git add src/background/index.ts
git commit -m "feat: add header rule handling to background worker

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Popup HeadersTab 组件

**Files:**
- Create: `src/popup/components/HeadersTab.vue`
- Modify: `src/popup/App.vue`
- Modify: `src/popup/components/QuickActions.vue`

**Interfaces:**
- Consumes: `useHeaderRuleStore`

- [ ] **Step 1: 创建 HeadersTab.vue**

```vue
<!-- src/popup/components/HeadersTab.vue -->
<template>
  <div class="p-2">
    <div class="flex items-center gap-2 mb-3">
      <select 
        v-model="selectedProfileId" 
        @change="handleProfileChange"
        class="flex-1 px-2 py-1.5 border rounded text-sm"
      >
        <option :value="null">No Profile Active</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.rules.length }} rules)
        </option>
      </select>
      <button 
        @click="$emit('openManager')"
        class="px-2 py-1.5 bg-gray-200 rounded hover:bg-gray-300 text-sm"
      >
        Manage
      </button>
    </div>

    <div v-if="activeProfile" class="space-y-1">
      <div 
        v-for="rule in activeProfile.rules" 
        :key="rule.id"
        class="flex items-center gap-2 p-2 bg-white rounded border"
      >
        <input 
          type="checkbox" 
          :checked="rule.enabled"
          @change="toggleRule(rule.id)"
          class="w-4 h-4"
        >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ rule.name }}</div>
          <div class="text-xs text-gray-500 truncate">{{ rule.headerName }}</div>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded" :class="getTargetClass(rule.target)">
          {{ rule.target }}
        </span>
      </div>
    </div>

    <div v-else class="text-center py-4 text-gray-500 text-sm">
      No profile active
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'
import type { HeaderRule } from '@/types'

const emit = defineEmits<{ openManager: [] }>()

const store = useHeaderRuleStore()
const selectedProfileId = ref<string | null>(null)

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
  }
}

function getTargetClass(target: 'request' | 'response') {
  return target === 'request' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>
```

- [ ] **Step 2: 修改 QuickActions.vue 添加 mode 类型**

在 `QuickActions.vue` 的 props 定义中，将 mode 类型修改为：

```typescript
const props = defineProps<{ 
  loading: boolean;
  count: number;
  mode: 'cookies' | 'local' | 'session' | 'headers';
}>()
```

- [ ] **Step 3: 修改 popup App.vue 添加 Headers tab**

在 `<script setup>` 中添加：

```typescript
import HeadersTab from './components/HeadersTab.vue'
```

修改 `currentMode` 的类型：

```typescript
const currentMode = ref<'cookies' | 'local' | 'session' | 'headers'>('cookies')
```

修改 `currentCount` computed：

```typescript
const currentCount = computed(() => {
  if (currentMode.value === 'cookies') return cookieCount.value
  if (currentMode.value === 'local') return localStorageCount.value
  if (currentMode.value === 'session') return sessionStorageCount.value
  return 0  // headers 模式暂不显示数量
})
```

在 `<template>` 中，在 StatusCard 和 QuickActions 之后，添加 HeadersTab 的条件渲染：

```vue
<template v-if="currentMode !== 'headers'">
  <!-- 现有的 QuickActions 和内容 -->
</template>
<template v-else>
  <HeadersTab @open-manager="openManager" />
</template>
```

在 QuickActions 组件调用处，添加 mode 切换按钮（tabs），修改为：

```vue
<div class="flex gap-1 mb-3">
  <button 
    v-for="m in ['cookies', 'local', 'session', 'headers']" 
    :key="m"
    @click="currentMode = m as any"
    :class="[
      'px-3 py-1.5 text-sm rounded transition-colors',
      currentMode === m ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
    ]"
  >
    {{ m === 'cookies' ? 'Cookies' : m === 'local' ? 'Local' : m === 'session' ? 'Session' : 'Headers' }}
  </button>
</div>

<QuickActions
  v-if="currentMode !== 'headers'"
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

<HeadersTab v-else @open-manager="openManager" />
```

- [ ] **Step 4: 提交**

```bash
git add src/popup/components/HeadersTab.vue src/popup/App.vue src/popup/components/QuickActions.vue
git commit -m "feat: add Headers tab to popup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Manager HeadersManager 组件

**Files:**
- Create: `src/manager/components/HeadersManager.vue`
- Modify: `src/manager/App.vue`
- Modify: `src/manager/components/TabNav.vue`

**Interfaces:**
- Consumes: `useHeaderRuleStore`

- [ ] **Step 1: 更新 TabNav.vue 类型**

修改 props 和 emits：

```vue
<!-- src/manager/components/TabNav.vue -->
<template>
  <div class="flex border-b bg-white">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      @click="$emit('update:active', tab.id)"
      class="px-4 py-2 text-sm font-medium transition-colors"
      :class="active === tab.id 
        ? 'text-chrome-blue border-b-2 border-chrome-blue' 
        : 'text-gray-600 hover:text-gray-800'"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ml-1 text-xs text-gray-400">({{ tab.count }})</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ 
  active: 'cookies' | 'local' | 'session' | 'headers';
  counts?: { cookies?: number; local?: number; session?: number; headers?: number }
}>()
defineEmits<{ 'update:active': ['cookies' | 'local' | 'session' | 'headers'] }>()

const tabs = computed(() => [
  { id: 'cookies' as const, label: 'Cookies', count: props.counts?.cookies },
  { id: 'local' as const, label: 'LocalStorage', count: props.counts?.local },
  { id: 'session' as const, label: 'SessionStorage', count: props.counts?.session },
  { id: 'headers' as const, label: 'Headers', count: props.counts?.headers }
])
</script>
```

- [ ] **Step 2: 创建 HeadersManager.vue**

```vue
<!-- src/manager/components/HeadersManager.vue -->
<template>
  <div class="flex flex-col h-full">
    <!-- Profile Bar -->
    <div class="flex items-center gap-2 p-3 bg-white border-b">
      <select 
        v-model="selectedProfileId"
        @change="handleProfileChange"
        class="px-3 py-1.5 border rounded text-sm"
      >
        <option :value="null">Select Profile</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button @click="showNewProfileModal = true" class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
        New Profile
      </button>
      <button 
        v-if="selectedProfileId"
        @click="showNewRuleModal = true"
        class="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
      >
        New Rule
      </button>
      <div class="flex-1"></div>
      <button @click="handleExport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
        Export
      </button>
      <button @click="triggerImport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
        Import
      </button>
      <input ref="fileInput" type="file" accept=".json" @change="handleImport" class="hidden" />
    </div>

    <!-- Rules List -->
    <div v-if="activeProfile" class="flex-1 overflow-auto p-3">
      <div class="space-y-2">
        <div 
          v-for="(rule, index) in activeProfile.rules"
          :key="rule.id"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragover.prevent
          @drop="onDrop($event, index)"
          class="flex items-center gap-3 p-3 bg-white rounded border hover:shadow-sm"
        >
          <input 
            type="checkbox" 
            :checked="rule.enabled"
            @change="toggleRule(rule.id)"
            class="w-4 h-4"
          >
          <div class="flex-1">
            <div class="font-medium">{{ rule.name }}</div>
            <div class="text-sm text-gray-500">
              {{ rule.headerName }}: {{ rule.action !== 'remove' ? rule.headerValue : '(removed)' }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ rule.urlPattern }} · {{ rule.methods.join(', ') || 'ALL' }} · {{ rule.target }}
            </div>
          </div>
          <button 
            @click="editRule(rule)"
            class="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
          >
            Edit
          </button>
          <button 
            @click="deleteRule(rule.id)"
            class="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-gray-500">
      Select or create a profile to manage rules
    </div>

    <!-- New Profile Modal -->
    <div v-if="showNewProfileModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewProfileModal = false">
      <div class="bg-white rounded-lg p-4 w-80">
        <h3 class="text-lg font-semibold mb-3">New Profile</h3>
        <input 
          v-model="newProfileName"
          type="text"
          placeholder="Profile name"
          class="w-full px-3 py-2 border rounded mb-3"
        />
        <div class="flex justify-end gap-2">
          <button @click="showNewProfileModal = false" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="createProfile" class="px-3 py-1.5 bg-blue-500 text-white rounded">Create</button>
        </div>
      </div>
    </div>

    <!-- New/Edit Rule Modal -->
    <div v-if="showNewRuleModal || editingRule" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeRuleModal">
      <div class="bg-white rounded-lg p-4 w-[400px]">
        <h3 class="text-lg font-semibold mb-3">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>
        
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Rule Name</label>
            <input v-model="ruleForm.name" type="text" class="w-full px-3 py-2 border rounded" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">URL Pattern</label>
            <input v-model="ruleForm.urlPattern" type="text" placeholder="*://api.example.com/*" class="w-full px-3 py-2 border rounded" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">HTTP Methods</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="m in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="m" class="flex items-center gap-1">
                <input type="checkbox" :value="m" v-model="ruleForm.methods" />
                <span class="text-sm">{{ m }}</span>
              </label>
            </div>
          </div>
          
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">Target</label>
              <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
                <option value="request">Request Header</option>
                <option value="response">Response Header</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">Action</label>
              <select v-model="ruleForm.action" class="w-full px-3 py-2 border rounded">
                <option value="add">Add</option>
                <option value="modify">Modify</option>
                <option value="remove">Remove</option>
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Header Name</label>
            <input v-model="ruleForm.headerName" type="text" placeholder="Authorization" class="w-full px-3 py-2 border rounded" />
          </div>
          
          <div v-if="ruleForm.action !== 'remove'">
            <label class="block text-sm font-medium mb-1">Header Value</label>
            <input v-model="ruleForm.headerValue" type="text" placeholder="Bearer token123" class="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        
        <div class="flex justify-end gap-2 mt-4">
          <button @click="closeRuleModal" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="saveRule" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
        </div>
      </div>
    </div>

    <div v-if="message" :class="['fixed bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'
import type { HeaderRule, HttpMethod, HeaderTarget, HeaderAction } from '@/types'

const store = useHeaderRuleStore()

const selectedProfileId = ref<string | null>(null)
const showNewProfileModal = ref(false)
const showNewRuleModal = ref(false)
const editingRule = ref<HeaderRule | null>(null)
const newProfileName = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const fileInput = ref<HTMLInputElement | null>(null)

const draggedIndex = ref<number | null>(null)

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

const ruleForm = ref({
  name: '',
  urlPattern: '*://*/*',
  methods: ['ALL'] as HttpMethod[],
  target: 'request' as HeaderTarget,
  action: 'add' as HeaderAction,
  headerName: '',
  headerValue: ''
})

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function createProfile() {
  if (!newProfileName.value.trim()) {
    showMessage('Please enter a profile name', 'error')
    return
  }
  await store.createProfile(newProfileName.value.trim())
  newProfileName.value = ''
  showNewProfileModal.value = false
  showMessage('Profile created')
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
  }
}

function editRule(rule: HeaderRule) {
  editingRule.value = rule
  ruleForm.value = {
    name: rule.name,
    urlPattern: rule.urlPattern,
    methods: [...rule.methods],
    target: rule.target,
    action: rule.action,
    headerName: rule.headerName,
    headerValue: rule.headerValue
  }
}

async function deleteRule(ruleId: string) {
  if (!activeProfile.value) return
  if (!confirm('Delete this rule?')) return
  await store.deleteRule(activeProfile.value.id, ruleId)
  showMessage('Rule deleted')
}

function closeRuleModal() {
  showNewRuleModal.value = false
  editingRule.value = null
  resetRuleForm()
}

function resetRuleForm() {
  ruleForm.value = {
    name: '',
    urlPattern: '*://*/*',
    methods: ['ALL'],
    target: 'request',
    action: 'add',
    headerName: '',
    headerValue: ''
  }
}

async function saveRule() {
  if (!activeProfile.value) return
  if (!ruleForm.value.name || !ruleForm.value.headerName) {
    showMessage('Name and Header Name are required', 'error')
    return
  }

  const ruleData: HeaderRule = {
    id: editingRule.value?.id ?? `rule-${Date.now()}`,
    enabled: editingRule.value?.enabled ?? true,
    name: ruleForm.value.name,
    urlPattern: ruleForm.value.urlPattern,
    methods: ruleForm.value.methods,
    action: ruleForm.value.action,
    headerName: ruleForm.value.headerName,
    headerValue: ruleForm.value.headerValue,
    target: ruleForm.value.target
  }

  if (editingRule.value) {
    await store.updateRule(activeProfile.value.id, editingRule.value.id, ruleData)
    showMessage('Rule updated')
  } else {
    await store.addRule(activeProfile.value.id, ruleData)
    showMessage('Rule created')
  }
  
  closeRuleModal()
}

function onDragStart(_e: DragEvent, index: number) {
  draggedIndex.value = index
}

function onDrop(_e: DragEvent, dropIndex: number) {
  if (!activeProfile.value || draggedIndex.value === null) return
  
  const ruleIds = [...activeProfile.value.rules.map(r => r.id)]
  const [removed] = ruleIds.splice(draggedIndex.value, 1)
  ruleIds.splice(dropIndex, 0, removed)
  
  store.reorderRules(activeProfile.value.id, ruleIds)
  draggedIndex.value = null
}

async function handleExport() {
  const response = await chrome.runtime.sendMessage({ action: 'exportHeaderProfiles' })
  if (response?.success && response?.data) {
    const blob = new Blob([response.data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `header-profiles-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage('Profiles exported')
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const text = await file.text()
  const response = await chrome.runtime.sendMessage({ 
    action: 'importHeaderProfiles', 
    jsonString: text 
  })
  
  if (response?.success) {
    await store.loadProfiles()
    showMessage('Profiles imported')
  } else {
    showMessage(response?.error || 'Import failed', 'error')
  }
  
  if (fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>
```

- [ ] **Step 3: 修改 manager App.vue**

在 `<script setup>` 中添加导入：

```typescript
import HeadersManager from '@/manager/components/HeadersManager.vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'

const headerRuleStore = useHeaderRuleStore()
```

添加 headers 计数：

```typescript
const headersCount = computed(() => 
  headerRuleStore.activeProfile?.rules.length ?? 0
)
```

修改 `tabCounts` computed：

```typescript
const tabCounts = computed(() => ({
  cookies: cookieStore.cookies.length,
  local: localStorageStore.items.length,
  session: sessionStorageStore.items.length,
  headers: headersCount.value
}))
```

修改 `activeTab` 类型：

```typescript
const activeTab = ref<'cookies' | 'local' | 'session' | 'headers'>('cookies')
```

在模板中添加 Headers tab 内容：

```vue
<template v-else-if="activeTab === 'headers'">
  <HeadersManager />
</template>
```

- [ ] **Step 4: 提交**

```bash
git add src/manager/components/HeadersManager.vue src/manager/components/TabNav.vue src/manager/App.vue
git commit -m "feat: add Headers manager component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: DevTools HeadersPanel 组件

**Files:**
- Create: `src/devtools/components/HeadersPanel.vue`
- Modify: `src/devtools/App.vue`

**Interfaces:**
- Consumes: `useHeaderRuleStore`

- [ ] **Step 1: 创建 HeadersPanel.vue**

```vue
<!-- src/devtools/components/HeadersPanel.vue -->
<template>
  <div class="h-full flex flex-col">
    <!-- Profile Selector -->
    <div class="flex items-center gap-2 p-2 bg-white border-b">
      <select 
        v-model="selectedProfileId"
        @change="handleProfileChange"
        class="flex-1 px-2 py-1.5 border rounded text-sm"
      >
        <option :value="null">No Active Profile</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.rules.filter(r => r.enabled).length }}/{{ p.rules.length }})
        </option>
      </select>
      <button 
        @click="refreshProfiles"
        class="px-2 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
      >
        Refresh
      </button>
    </div>

    <!-- Rules List -->
    <div class="flex-1 overflow-auto">
      <div v-if="activeProfile" class="p-2 space-y-1">
        <div 
          v-for="rule in activeProfile.rules"
          :key="rule.id"
          class="flex items-center gap-2 p-2 bg-white rounded border text-sm"
        >
          <input 
            type="checkbox" 
            :checked="rule.enabled"
            @change="toggleRule(rule.id)"
            class="w-4 h-4"
          >
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ rule.name }}</div>
            <div class="text-xs text-gray-500 truncate">
              {{ rule.headerName }} · {{ rule.target }} · {{ rule.action }}
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="p-4 text-center text-gray-500 text-sm">
        No profile active. Use Manager to configure profiles.
      </div>
    </div>

    <div v-if="message" :class="['p-2 text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'

const store = useHeaderRuleStore()

const selectedProfileId = ref<string | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 2000)
}

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
    showMessage(`Rule ${!rule.enabled ? 'enabled' : 'disabled'}`)
  }
}

async function refreshProfiles() {
  await store.loadProfiles()
  showMessage('Profiles refreshed')
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>
```

- [ ] **Step 2: 修改 devtools App.vue**

添加导入：

```typescript
import HeadersPanel from './components/HeadersPanel.vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'

const headerRuleStore = useHeaderRuleStore()
```

添加 tab 切换状态：

```typescript
const activePanel = ref<'cookies' | 'headers'>('cookies')
```

修改模板，添加 tab 切换：

```vue
<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <header class="bg-white border-b px-4 py-2 flex items-center gap-4">
      <h1 class="text-lg font-semibold">Coffer DevTools</h1>
      <div class="flex gap-1">
        <button 
          @click="activePanel = 'cookies'"
          :class="['px-3 py-1 text-sm rounded', activePanel === 'cookies' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
        >
          Cookies
        </button>
        <button 
          @click="activePanel = 'headers'"
          :class="['px-3 py-1 text-sm rounded', activePanel === 'headers' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
        >
          Headers
        </button>
      </div>
      <div class="flex-1"></div>
      <button @click="showNewModal = true" class="px-3 py-1.5 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 text-sm" v-if="activePanel === 'cookies'">New Cookie</button>
      <button @click="showSettings = true" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Settings</button>
      <button @click="refresh" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Refresh</button>
    </header>

    <CookiesPanel v-if="activePanel === 'cookies'" />
    <HeadersPanel v-else />

    <!-- 现有的 modal 代码... -->
  </div>
</template>
```

添加 refresh 函数：

```typescript
async function refresh() {
  if (activePanel.value === 'cookies') {
    await loadAllCookies()
  } else {
    await headerRuleStore.loadProfiles()
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/devtools/components/HeadersPanel.vue src/devtools/App.vue
git commit -m "feat: add Headers panel to DevTools

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: 单元测试

**Files:**
- Create: `tests/unit/headerRuleService.test.ts`
- Create: `tests/unit/headerRuleStore.test.ts`

- [ ] **Step 1: 创建 headerRuleService 测试**

```typescript
// tests/unit/headerRuleService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HeaderRuleService } from '@/services/headerRuleService'
import type { HeaderRule, HeaderProfile } from '@/types'

// Mock Chrome APIs
const mockUpdateDynamicRules = vi.fn()
const mockGetDynamicRules = vi.fn().mockResolvedValue([])

vi.stubGlobal('chrome', {
  declarativeNetRequest: {
    updateDynamicRules: mockUpdateDynamicRules,
    getDynamicRules: mockGetDynamicRules
  }
})

describe('HeaderRuleService', () => {
  let service: HeaderRuleService

  beforeEach(() => {
    service = new HeaderRuleService()
    vi.clearAllMocks()
  })

  describe('convertToChromeRules', () => {
    it('should convert a simple add request header rule', () => {
      const rule: HeaderRule = {
        id: 'rule-1',
        enabled: true,
        name: 'Add Auth',
        urlPattern: '*://api.example.com/*',
        methods: ['GET', 'POST'],
        action: 'add',
        headerName: 'Authorization',
        headerValue: 'Bearer token123',
        target: 'request'
      }

      const chromeRules = service.convertToChromeRules([rule])

      expect(chromeRules).toHaveLength(1)
      expect(chromeRules[0].action.type).toBe('modifyHeaders')
      expect(chromeRules[0].action.requestHeaders).toHaveLength(1)
      expect(chromeRules[0].action.requestHeaders?.[0].header).toBe('Authorization')
      expect(chromeRules[0].action.requestHeaders?.[0].operation).toBe('append')
      expect(chromeRules[0].condition.urlFilter).toBe('*://api.example.com/*')
    })

    it('should convert a remove response header rule', () => {
      const rule: HeaderRule = {
        id: 'rule-2',
        enabled: true,
        name: 'Remove CSP',
        urlPattern: '*://*/*',
        methods: ['ALL'],
        action: 'remove',
        headerName: 'Content-Security-Policy',
        headerValue: '',
        target: 'response'
      }

      const chromeRules = service.convertToChromeRules([rule])

      expect(chromeRules).toHaveLength(1)
      expect(chromeRules[0].action.type).toBe('removeHeaders')
      expect(chromeRules[0].action.responseHeaders).toHaveLength(1)
      expect(chromeRules[0].action.responseHeaders?.[0].header).toBe('Content-Security-Policy')
      expect(chromeRules[0].condition.requestMethods).toBeUndefined()
    })
  })

  describe('syncRulesToChrome', () => {
    it('should clear rules when profile is null', async () => {
      await service.syncRulesToChrome(null)

      expect(mockGetDynamicRules).toHaveBeenCalled()
      expect(mockUpdateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: []
      })
    })

    it('should sync enabled rules from profile', async () => {
      const profile: HeaderProfile = {
        id: 'profile-1',
        name: 'Test',
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            enabled: true,
            name: 'Test Rule',
            urlPattern: '*://*/*',
            methods: ['ALL'],
            action: 'add',
            headerName: 'X-Test',
            headerValue: 'test',
            target: 'request'
          }
        ]
      }

      await service.syncRulesToChrome(profile)

      expect(mockUpdateDynamicRules).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: 创建 headerRuleStore 测试**

```typescript
// tests/unit/headerRuleStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'

// Mock storage
vi.mock('@/services/headerRuleStorage', () => ({
  headerRuleStorage: {
    getProfiles: vi.fn().mockResolvedValue([
      { id: 'default', name: 'Default', enabled: true, rules: [] }
    ]),
    saveProfiles: vi.fn().mockResolvedValue(undefined),
    getActiveProfileId: vi.fn().mockResolvedValue('default'),
    setActiveProfileId: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock service
vi.mock('@/services/headerRuleService', () => ({
  headerRuleService: {
    syncRulesToChrome: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('headerRuleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should load profiles on init', async () => {
    const store = useHeaderRuleStore()
    
    await store.loadProfiles()
    
    expect(store.profiles).toHaveLength(1)
    expect(store.profiles[0].name).toBe('Default')
  })

  it('should create a new profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()
    
    const profile = await store.createProfile('New Profile')
    
    expect(profile.name).toBe('New Profile')
    expect(store.profiles).toHaveLength(2)
  })

  it('should add rule to profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()
    
    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      action: 'add',
      headerName: 'X-Test',
      headerValue: 'test',
      target: 'request'
    })
    
    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules).toHaveLength(1)
  })

  it('should delete rule from profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()
    
    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      action: 'add',
      headerName: 'X-Test',
      headerValue: 'test',
      target: 'request'
    })
    
    await store.deleteRule('default', 'rule-1')
    
    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules).toHaveLength(0)
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
npm run test:run
```

Expected: All tests pass

- [ ] **Step 4: 提交**

```bash
git add tests/unit/headerRuleService.test.ts tests/unit/headerRuleStore.test.ts
git commit -m "test: add unit tests for header rule service and store

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: 构建验证和文档更新

**Files:**
- Modify: `README.md`
- Modify: `README_CN.md`

- [ ] **Step 1: 构建扩展**

```bash
npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 2: 更新 README.md 添加 Headers 功能说明**

在 Features 部分添加：

```markdown
### Header Modification
- **Request Headers**: Add, modify, or remove request headers for debugging and testing
- **Response Headers**: Modify response headers for development and testing
- **URL Pattern Matching**: Apply rules based on URL patterns with wildcard support
- **HTTP Method Filter**: Target specific request methods (GET, POST, PUT, etc.)
- **Profile Management**: Create multiple profiles for different environments
- **Import/Export**: Share profiles across team members
```

- [ ] **Step 3: 更新 README_CN.md 添加 Headers 功能说明**

```markdown
### 请求头修改
- **请求头管理**: 添加、修改或删除请求头，用于调试和测试
- **响应头管理**: 修改响应头，用于开发和测试
- **URL 模式匹配**: 基于通配符的 URL 匹配规则
- **HTTP 方法过滤**: 针对特定请求方法（GET、POST、PUT 等）
- **配置文件管理**: 为不同环境创建多个配置文件
- **导入/导出**: 在团队成员间共享配置
```

- [ ] **Step 4: 最终提交**

```bash
git add README.md README_CN.md
git commit -m "docs: add header modification feature documentation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Header 操作 | Task 3, 7 |
| URL 匹配 (add/modify/remove) | Task 1, 3 |
| HTTP 方法过滤 | Task 1, 3 |
| 规则优先级 (按顺序应用) | Task 3, 7 |
| Profile 管理 | Task 4, 7 |
| UI 入口 | Task 6, 7, 8 |
| declarativeNetRequest API | Task 1, 3, 5 |
| 导入/导出 | Task 5, 7 |
| 边界处理 | Task 7 (validation in UI) |
| 单元测试 | Task 9 |

---

## Placeholder Scan

- ✅ No TBD/TODO
- ✅ No "implement later"
- ✅ No vague instructions
- ✅ All code blocks contain actual implementation

---

## Type Consistency Check

- `HeaderRule` interface defined in Task 1, used consistently in Tasks 3, 4, 7
- `HeaderProfile` interface defined in Task 1, used in Tasks 3, 4, 5
- `HttpMethod`, `HeaderTarget`, `HeaderAction` types defined and reused
- Store method names consistent: `loadProfiles`, `saveProfiles`, `setActiveProfile`, etc.
