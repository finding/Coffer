diff --git a/src/services/headerRuleService.ts b/src/services/headerRuleService.ts
new file mode 100644
index 0000000..9b3cd4a
--- /dev/null
+++ b/src/services/headerRuleService.ts
@@ -0,0 +1,93 @@
+// src/services/headerRuleService.ts
+
+import type { HeaderRule, HeaderProfile } from '@/types'
+import { headerRuleStorage } from './headerRuleStorage'
+
+export class HeaderRuleService {
+  private ruleIdCounter = 1
+
+  async syncRulesToChrome(profile: HeaderProfile | null): Promise<void> {
+    await this.clearAllRules()
+
+    if (!profile || !profile.enabled) return
+
+    const enabledRules = profile.rules.filter(r => r.enabled)
+    const chromeRules = this.convertToChromeRules(enabledRules)
+
+    if (chromeRules.length > 0) {
+      await chrome.declarativeNetRequest.updateDynamicRules({
+        addRules: chromeRules
+      })
+    }
+  }
+
+  convertToChromeRules(rules: HeaderRule[]): chrome.declarativeNetRequest.Rule[] {
+    return rules.map((rule, index) => this.convertSingleRule(rule, index))
+  }
+
+  private convertSingleRule(rule: HeaderRule, index: number): chrome.declarativeNetRequest.Rule {
+    const chromeRuleId = this.ruleIdCounter++
+
+    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
+      header: rule.headerName,
+      operation: this.getOperation(rule.action),
+      value: rule.action !== 'remove' ? rule.headerValue : undefined
+    }
+
+    const requestMethods = rule.methods.includes('ALL')
+      ? undefined
+      : rule.methods.map(m => m.toLowerCase() as chrome.declarativeNetRequest.RequestMethod)
+
+    return {
+      id: chromeRuleId,
+      priority: 1000 - index,
+      action: {
+        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
+        requestHeaders: rule.target === 'request' ? [headerInfo] : undefined,
+        responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
+      },
+      condition: {
+        urlFilter: rule.urlPattern,
+        requestMethods,
+        resourceTypes: [
+          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
+          chrome.declarativeNetRequest.ResourceType.SCRIPT,
+          chrome.declarativeNetRequest.ResourceType.IMAGE,
+          chrome.declarativeNetRequest.ResourceType.STYLESHEET,
+          chrome.declarativeNetRequest.ResourceType.MEDIA,
+          chrome.declarativeNetRequest.ResourceType.FONT,
+          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
+          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
+          chrome.declarativeNetRequest.ResourceType.OTHER
+        ]
+      }
+    }
+  }
+
+  private getOperation(action: 'add' | 'modify' | 'remove'): chrome.declarativeNetRequest.HeaderOperation {
+    switch (action) {
+      case 'add': return chrome.declarativeNetRequest.HeaderOperation.APPEND
+      case 'modify': return chrome.declarativeNetRequest.HeaderOperation.SET
+      case 'remove': return chrome.declarativeNetRequest.HeaderOperation.REMOVE
+    }
+  }
+
+  async clearAllRules(): Promise<void> {
+    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
+    if (existingRules.length > 0) {
+      await chrome.declarativeNetRequest.updateDynamicRules({
+        removeRuleIds: existingRules.map(r => r.id)
+      })
+    }
+    this.ruleIdCounter = 1
+  }
+
+  async initialize(): Promise<void> {
+    const activeProfile = await headerRuleStorage.getActiveProfile()
+    if (activeProfile) {
+      await this.syncRulesToChrome(activeProfile)
+    }
+  }
+}
+
+export const headerRuleService = new HeaderRuleService()
\ No newline at end of file
diff --git a/src/services/headerRuleStorage.ts b/src/services/headerRuleStorage.ts
new file mode 100644
index 0000000..f76b922
--- /dev/null
+++ b/src/services/headerRuleStorage.ts
@@ -0,0 +1,45 @@
+// src/services/headerRuleStorage.ts
+
+import type { HeaderProfile } from '@/types'
+
+const PROFILES_KEY = 'headerProfiles'
+const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'
+
+const DEFAULT_PROFILE: HeaderProfile = {
+  id: 'default',
+  name: 'Default',
+  enabled: true,
+  rules: []
+}
+
+export class HeaderRuleStorage {
+  async getProfiles(): Promise<HeaderProfile[]> {
+    const result = await chrome.storage.local.get(PROFILES_KEY)
+    return result[PROFILES_KEY] ?? [DEFAULT_PROFILE]
+  }
+
+  async saveProfiles(profiles: HeaderProfile[]): Promise<void> {
+    await chrome.storage.local.set({ [PROFILES_KEY]: profiles })
+  }
+
+  async getActiveProfileId(): Promise<string | null> {
+    const result = await chrome.storage.local.get(ACTIVE_PROFILE_KEY)
+    return result[ACTIVE_PROFILE_KEY] ?? null
+  }
+
+  async setActiveProfileId(profileId: string | null): Promise<void> {
+    if (profileId) {
+      await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: profileId })
+    } else {
+      await chrome.storage.local.remove(ACTIVE_PROFILE_KEY)
+    }
+  }
+
+  async getActiveProfile(): Promise<HeaderProfile | null> {
+    const profiles = await this.getProfiles()
+    const activeId = await this.getActiveProfileId()
+    return profiles.find(p => p.id === activeId) ?? null
+  }
+}
+
+export const headerRuleStorage = new HeaderRuleStorage()
\ No newline at end of file
diff --git a/src/stores/headerRuleStore.ts b/src/stores/headerRuleStore.ts
new file mode 100644
index 0000000..15faaaa
--- /dev/null
+++ b/src/stores/headerRuleStore.ts
@@ -0,0 +1,153 @@
+// src/stores/headerRuleStore.ts
+
+import { defineStore } from 'pinia'
+import { ref, computed } from 'vue'
+import type { HeaderProfile, HeaderRule } from '@/types'
+import { headerRuleStorage } from '@/services/headerRuleStorage'
+import { headerRuleService } from '@/services/headerRuleService'
+
+export const useHeaderRuleStore = defineStore('headerRules', () => {
+  const profiles = ref<HeaderProfile[]>([])
+  const activeProfileId = ref<string | null>(null)
+  const loading = ref(false)
+  const error = ref<string | null>(null)
+
+  const activeProfile = computed(() =>
+    profiles.value.find(p => p.id === activeProfileId.value) ?? null
+  )
+
+  async function loadProfiles(): Promise<void> {
+    loading.value = true
+    error.value = null
+    try {
+      profiles.value = await headerRuleStorage.getProfiles()
+      activeProfileId.value = await headerRuleStorage.getActiveProfileId()
+    } catch (e) {
+      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
+    } finally {
+      loading.value = false
+    }
+  }
+
+  async function saveProfiles(): Promise<void> {
+    await headerRuleStorage.saveProfiles(profiles.value)
+  }
+
+  async function setActiveProfile(profileId: string | null): Promise<void> {
+    activeProfileId.value = profileId
+    await headerRuleStorage.setActiveProfileId(profileId)
+
+    const profile = profiles.value.find(p => p.id === profileId) ?? null
+    await headerRuleService.syncRulesToChrome(profile)
+  }
+
+  async function createProfile(name: string): Promise<HeaderProfile> {
+    const profile: HeaderProfile = {
+      id: `profile-${Date.now()}`,
+      name,
+      enabled: true,
+      rules: []
+    }
+    profiles.value.push(profile)
+    await saveProfiles()
+    return profile
+  }
+
+  async function updateProfile(profileId: string, updates: Partial<HeaderProfile>): Promise<void> {
+    const index = profiles.value.findIndex(p => p.id === profileId)
+    if (index !== -1) {
+      profiles.value[index] = { ...profiles.value[index], ...updates }
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profiles.value[index])
+      }
+    }
+  }
+
+  async function deleteProfile(profileId: string): Promise<void> {
+    const index = profiles.value.findIndex(p => p.id === profileId)
+    if (index !== -1) {
+      profiles.value.splice(index, 1)
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await setActiveProfile(null)
+      }
+    }
+  }
+
+  async function addRule(profileId: string, rule: HeaderRule): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      profile.rules.push(rule)
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+      }
+    }
+  }
+
+  async function updateRule(profileId: string, ruleId: string, updates: Partial<HeaderRule>): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      const index = profile.rules.findIndex(r => r.id === ruleId)
+      if (index !== -1) {
+        profile.rules[index] = { ...profile.rules[index], ...updates }
+        await saveProfiles()
+
+        if (activeProfileId.value === profileId) {
+          await headerRuleService.syncRulesToChrome(profile)
+        }
+      }
+    }
+  }
+
+  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      profile.rules = profile.rules.filter(r => r.id !== ruleId)
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+      }
+    }
+  }
+
+  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      const reorderedRules: HeaderRule[] = []
+      for (const id of ruleIds) {
+        const rule = profile.rules.find(r => r.id === id)
+        if (rule) reorderedRules.push(rule)
+      }
+      profile.rules = reorderedRules
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+      }
+    }
+  }
+
+  return {
+    profiles,
+    activeProfileId,
+    activeProfile,
+    loading,
+    error,
+    loadProfiles,
+    saveProfiles,
+    setActiveProfile,
+    createProfile,
+    updateProfile,
+    deleteProfile,
+    addRule,
+    updateRule,
+    deleteRule,
+    reorderRules
+  }
+})
\ No newline at end of file
diff --git a/src/types/headerRule.ts b/src/types/headerRule.ts
new file mode 100644
index 0000000..4e300ca
--- /dev/null
+++ b/src/types/headerRule.ts
@@ -0,0 +1,31 @@
+// src/types/headerRule.ts
+
+export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'
+
+export type HeaderTarget = 'request' | 'response'
+
+export type HeaderAction = 'add' | 'modify' | 'remove'
+
+export interface HeaderRule {
+  id: string
+  enabled: boolean
+  name: string
+  urlPattern: string
+  methods: HttpMethod[]
+  action: HeaderAction
+  headerName: string
+  headerValue: string
+  target: HeaderTarget
+}
+
+export interface HeaderProfile {
+  id: string
+  name: string
+  enabled: boolean
+  rules: HeaderRule[]
+}
+
+export interface HeaderProfilesExport {
+  version: string
+  profiles: HeaderProfile[]
+}
\ No newline at end of file
diff --git a/src/types/index.ts b/src/types/index.ts
index 4d17613..14d1303 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -25,38 +25,47 @@ export interface CookieFilters {
 }
 
 export interface Settings {
   persistMode: boolean
   theme: 'light' | 'dark'
   maxClipboardItems: number
 }
 
 export type CookieAttribute = 'secure' | 'httpOnly' | 'session'
 
+export * from './headerRule'
+
+import type { HeaderProfile } from './headerRule'
+
 export interface MessagePayload {
-  action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard'
+  action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard' | 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles'
   data?: unknown
   tabId?: number
   storageType?: 'local' | 'session'
   key?: string
   value?: string
   items?: { key: string; value: string }[]
   keys?: string[]
+  profiles?: HeaderProfile[]
+  profileId?: string
+  ruleId?: string
+  profileData?: HeaderProfile
+  jsonString?: string
 }
 
 export interface MessageResponse<T = unknown> {
   success: boolean
   data?: T
   error?: string
 }
 
 export interface StorageItem {
   key: string
   value: string
 }
 
 export interface StorageClipboardItem {
   items: StorageItem[]
   sourceDomain: string
   storageType: 'local' | 'session'
   copiedAt: number
-}
+}
\ No newline at end of file
