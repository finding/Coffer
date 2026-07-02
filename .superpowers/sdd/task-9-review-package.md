# Task 9 Review Package

## Commit History
```
934e411 feat: add RequestRewrite store with full CRUD operations
```

## Diff Stats
```
 src/services/headerRuleService.ts |  93 ++++++++++++++--
 src/stores/requestRewriteStore.ts | 221 ++++++++++++++++++++++++++++++++++++++
 2 files changed, 307 insertions(+), 7 deletions(-)
```

## Full Diff
diff --git a/src/services/headerRuleService.ts b/src/services/headerRuleService.ts
index fcd40fb..42c19b9 100644
--- a/src/services/headerRuleService.ts
+++ b/src/services/headerRuleService.ts
@@ -1,37 +1,80 @@
 // src/services/headerRuleService.ts
 
-import type { HeaderRule, HeaderProfile } from '@/types'
+import type { HeaderRule, HeaderProfile, RequestRewriteProfile, RequestRewriteRule } from '@/types'
 import { headerRuleStorage } from './headerRuleStorage'
 
 export class HeaderRuleService {
   private ruleIdCounter = 1
 
-  async syncRulesToChrome(profile: HeaderProfile | null): Promise<void> {
+  /**
+   * Sync rules to Chrome declarativeNetRequest
+   * Supports both old HeaderProfile and new RequestRewriteProfile formats
+   */
+  async syncRulesToChrome(profile: HeaderProfile | RequestRewriteProfile | null): Promise<void> {
     await this.clearAllRules()
 
     if (!profile || !profile.enabled) return
 
     const enabledRules = profile.rules.filter(r => r.enabled)
-    const chromeRules = this.convertToChromeRules(enabledRules)
 
-    if (chromeRules.length > 0) {
-      await chrome.declarativeNetRequest.updateDynamicRules({
-        addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
-      })
+    // Check if this is the new format (has headers array) or old format (has direct header properties)
+    const firstRule = enabledRules[0] as HeaderRule | RequestRewriteRule
+    const isNewFormat = firstRule && 'headers' in firstRule
+
+    if (isNewFormat) {
+      const chromeRules = this.convertNewFormatToChromeRules(enabledRules as RequestRewriteRule[])
+      if (chromeRules.length > 0) {
+        await chrome.declarativeNetRequest.updateDynamicRules({
+          addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
+        })
+      }
+    } else {
+      const chromeRules = this.convertToChromeRules(enabledRules as HeaderRule[])
+      if (chromeRules.length > 0) {
+        await chrome.declarativeNetRequest.updateDynamicRules({
+          addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
+        })
+      }
     }
   }
 
+  /**
+   * Convert old format HeaderRule to Chrome rules
+   */
   convertToChromeRules(rules: HeaderRule[]): chrome.declarativeNetRequest.Rule[] {
     return rules.map((rule, index) => this.convertSingleRule(rule, index)) as chrome.declarativeNetRequest.Rule[]
   }
 
+  /**
+   * Convert new format RequestRewriteRule to Chrome rules
+   * Each rule with multiple headers expands to multiple Chrome rules
+   */
+  convertNewFormatToChromeRules(rules: RequestRewriteRule[]): chrome.declarativeNetRequest.Rule[] {
+    const chromeRules: chrome.declarativeNetRequest.Rule[] = []
+    let ruleIndex = 0
+
+    for (const rule of rules) {
+      if (!rule.headers || rule.headers.length === 0) continue
+
+      for (const headerAction of rule.headers) {
+        const chromeRule = this.convertNewRuleToChromeRule(rule, headerAction, ruleIndex++)
+        chromeRules.push(chromeRule as chrome.declarativeNetRequest.Rule)
+      }
+    }
+
+    return chromeRules
+  }
+
+  /**
+   * Convert a single old format rule to Chrome rule
+   */
   private convertSingleRule(rule: HeaderRule, index: number) {
     const chromeRuleId = this.ruleIdCounter++
 
     const headerInfo = {
       header: rule.headerName,
       operation: this.getOperation(rule.action),
       value: rule.action !== 'remove' ? rule.headerValue : undefined
     }
 
     const requestMethods = rule.methods.includes('ALL')
@@ -47,20 +90,56 @@ export class HeaderRuleService {
         responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
       },
       condition: {
         urlFilter: rule.urlPattern,
         requestMethods,
         resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'main_frame', 'sub_frame', 'other']
       }
     }
   }
 
+  /**
+   * Convert a single new format rule header action to Chrome rule
+   */
+  private convertNewRuleToChromeRule(
+    rule: RequestRewriteRule,
+    headerAction: { action: 'add' | 'modify' | 'remove'; headerName: string; headerValue: string },
+    index: number
+  ) {
+    const chromeRuleId = this.ruleIdCounter++
+
+    const headerInfo = {
+      header: headerAction.headerName,
+      operation: this.getOperation(headerAction.action),
+      value: headerAction.action !== 'remove' ? headerAction.headerValue : undefined
+    }
+
+    const requestMethods = rule.methods.includes('ALL')
+      ? undefined
+      : rule.methods.map(m => m.toLowerCase())
+
+    return {
+      id: chromeRuleId,
+      priority: 1000 - index,
+      action: {
+        type: headerAction.action === 'remove' ? 'removeHeaders' : 'modifyHeaders',
+        requestHeaders: rule.target === 'request' ? [headerInfo] : undefined,
+        responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
+      },
+      condition: {
+        urlFilter: rule.urlPattern,
+        requestMethods,
+        resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'main_frame', 'sub_frame', 'other']
+      }
+    }
+  }
+
   private getOperation(action: 'add' | 'modify' | 'remove') {
     switch (action) {
       case 'add': return 'set'
       case 'modify': return 'set'
       case 'remove': return 'remove'
     }
   }
 
   async clearAllRules(): Promise<void> {
     const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
diff --git a/src/stores/requestRewriteStore.ts b/src/stores/requestRewriteStore.ts
new file mode 100644
index 0000000..53f59ca
--- /dev/null
+++ b/src/stores/requestRewriteStore.ts
@@ -0,0 +1,221 @@
+// src/stores/requestRewriteStore.ts
+
+import { defineStore } from 'pinia'
+import { ref, computed } from 'vue'
+import type { RequestRewriteProfile, RequestRewriteRule } from '@/types'
+import { requestRewriteStorage } from '@/services/requestRewriteStorage'
+import { headerRuleService } from '@/services/headerRuleService'
+
+export const useRequestRewriteStore = defineStore('requestRewrite', () => {
+  const profiles = ref<RequestRewriteProfile[]>([])
+  const activeProfileId = ref<string | null>(null)
+  const loading = ref(false)
+  const error = ref<string | null>(null)
+
+  const activeProfile = computed(() =>
+    profiles.value.find(p => p.id === activeProfileId.value) ?? null
+  )
+
+  /**
+   * Notify content scripts that rules have been updated
+   */
+  async function notifyRulesUpdated(): Promise<void> {
+    try {
+      await chrome.runtime.sendMessage({ action: 'requestRewriteRulesUpdated' })
+    } catch (e) {
+      // Ignore - content script may not be listening
+      console.log('[RequestRewriteStore] notifyRulesUpdated: no listener', e)
+    }
+  }
+
+  /**
+   * Load profiles from storage
+   */
+  async function loadProfiles(): Promise<void> {
+    loading.value = true
+    error.value = null
+    try {
+      await requestRewriteStorage.init()
+      profiles.value = await requestRewriteStorage.getProfiles()
+      activeProfileId.value = await requestRewriteStorage.getActiveProfileId()
+    } catch (e) {
+      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
+      console.error('[RequestRewriteStore] loadProfiles error:', e)
+    } finally {
+      loading.value = false
+    }
+  }
+
+  /**
+   * Save profiles to storage
+   */
+  async function saveProfiles(): Promise<void> {
+    await requestRewriteStorage.saveProfiles(profiles.value)
+  }
+
+  /**
+   * Set the active profile and sync rules to Chrome
+   */
+  async function setActiveProfile(profileId: string | null): Promise<void> {
+    activeProfileId.value = profileId
+    await requestRewriteStorage.setActiveProfileId(profileId)
+
+    const profile = profiles.value.find(p => p.id === profileId) ?? null
+    await headerRuleService.syncRulesToChrome(profile)
+    await notifyRulesUpdated()
+  }
+
+  /**
+   * Create a new profile
+   */
+  async function createProfile(name: string): Promise<RequestRewriteProfile> {
+    const profile: RequestRewriteProfile = {
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
+  /**
+   * Update an existing profile
+   */
+  async function updateProfile(profileId: string, updates: Partial<RequestRewriteProfile>): Promise<void> {
+    const index = profiles.value.findIndex(p => p.id === profileId)
+    if (index !== -1) {
+      profiles.value[index] = { ...profiles.value[index], ...updates }
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profiles.value[index])
+        await notifyRulesUpdated()
+      }
+    }
+  }
+
+  /**
+   * Delete a profile
+   */
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
+  /**
+   * Add a rule to a profile
+   */
+  async function addRule(profileId: string, rule: RequestRewriteRule): Promise<void> {
+    console.log('[RequestRewriteStore] addRule', profileId, rule.name)
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      profile.rules.push(rule)
+      await saveProfiles()
+      console.log('[RequestRewriteStore] saved profiles:', profiles.value.length, 'total rules:', profile.rules.length)
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+        await notifyRulesUpdated()
+      }
+    } else {
+      console.error('[RequestRewriteStore] profile not found:', profileId)
+    }
+  }
+
+  /**
+   * Update a rule in a profile
+   */
+  async function updateRule(profileId: string, ruleId: string, updates: Partial<RequestRewriteRule>): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      const index = profile.rules.findIndex(r => r.id === ruleId)
+      if (index !== -1) {
+        profile.rules[index] = { ...profile.rules[index], ...updates }
+        await saveProfiles()
+
+        if (activeProfileId.value === profileId) {
+          await headerRuleService.syncRulesToChrome(profile)
+          await notifyRulesUpdated()
+        }
+      }
+    }
+  }
+
+  /**
+   * Delete a rule from a profile
+   */
+  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      profile.rules = profile.rules.filter(r => r.id !== ruleId)
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+        await notifyRulesUpdated()
+      }
+    }
+  }
+
+  /**
+   * Reorder rules within a profile
+   */
+  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
+    const profile = profiles.value.find(p => p.id === profileId)
+    if (profile) {
+      const reorderedRules: RequestRewriteRule[] = []
+      for (const id of ruleIds) {
+        const rule = profile.rules.find(r => r.id === id)
+        if (rule) reorderedRules.push(rule)
+      }
+      profile.rules = reorderedRules
+      await saveProfiles()
+
+      if (activeProfileId.value === profileId) {
+        await headerRuleService.syncRulesToChrome(profile)
+        await notifyRulesUpdated()
+      }
+    }
+  }
+
+  return {
+    // State
+    profiles,
+    activeProfileId,
+    activeProfile,
+    loading,
+    error,
+
+    // Profile CRUD
+    loadProfiles,
+    saveProfiles,
+    setActiveProfile,
+    createProfile,
+    updateProfile,
+    deleteProfile,
+
+    // Rule CRUD
+    addRule,
+    updateRule,
+    deleteRule,
+    reorderRules,
+
+    // Notifications
+    notifyRulesUpdated
+  }
+})
+
+/**
+ * Backward-compatible alias for existing code
+ * @deprecated Use useRequestRewriteStore instead
+ */
+export const useHeaderRuleStore = useRequestRewriteStore
