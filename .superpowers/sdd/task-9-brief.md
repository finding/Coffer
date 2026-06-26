# Task 9: 更新Store

**Context:** This task creates a new Pinia store that replaces headerRuleStore, with full CRUD for profiles and rules, plus notification to content scripts when rules change.

**Files:**
- Create: `src/stores/requestRewriteStore.ts`

**Interfaces:**
- Consumes: `requestRewriteStorage` from Task 8, `headerRuleService` (existing)
- Produces: `useRequestRewriteStore()` with complete CRUD and notification

---

## Steps

- [ ] **Step 1: 创建新Store**

The store must:
1. Manage profiles and rules with full CRUD
2. Call headerRuleService.syncRulesToChrome for headers
3. Notify content script when rules change
4. Provide backward-compatible alias `useHeaderRuleStore`

Key methods:
- loadProfiles() - load and initialize storage
- setActiveProfile() - switch active profile
- createProfile(), updateProfile(), deleteProfile()
- addRule(), updateRule(), deleteRule(), reorderRules()
- notifyRulesUpdated() - send message to background

```typescript
// src/stores/requestRewriteStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RequestRewriteProfile, RequestRewriteRule } from '@/types'
import { requestRewriteStorage } from '@/services/requestRewriteStorage'
import { headerRuleService } from '@/services/headerRuleService'

export const useRequestRewriteStore = defineStore('requestRewrite', () => {
  const profiles = ref<RequestRewriteProfile[]>([])
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
      await requestRewriteStorage.init()
      profiles.value = await requestRewriteStorage.getProfiles()
      activeProfileId.value = await requestRewriteStorage.getActiveProfileId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
    } finally {
      loading.value = false
    }
  }

  async function notifyRulesUpdated(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ action: 'requestRewriteRulesUpdated' })
    } catch (e) {
      // Ignore - may not have content script listening
    }
  }

  async function setActiveProfile(profileId: string | null): Promise<void> {
    activeProfileId.value = profileId
    await requestRewriteStorage.setActiveProfileId(profileId)
    const profile = profiles.value.find(p => p.id === profileId) ?? null
    await headerRuleService.syncRulesToChrome(profile)
    await notifyRulesUpdated()
  }

  // ... other CRUD methods similar to brief

  return {
    profiles, activeProfileId, activeProfile, loading, error,
    loadProfiles, setActiveProfile, createProfile, updateProfile, deleteProfile,
    addRule, updateRule, deleteRule, reorderRules
  }
})

// Backward-compatible alias
export const useHeaderRuleStore = useRequestRewriteStore
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/requestRewriteStore.ts
git commit -m "feat: add RequestRewrite store with full CRUD operations"
```

---

**Global Constraints:**
- 数据结构向后兼容
- 同步Headers规则到Chrome declarativeNetRequest
- 通知content script规则已更新
