diff --git a/src/services/headerRuleService.ts b/src/services/headerRuleService.ts
new file mode 100644
index 0000000..4142260
--- /dev/null
+++ b/src/services/headerRuleService.ts
@@ -0,0 +1,95 @@
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
+          chrome.declarativeNetRequest.ResourceType.OTHER
+        ]
+      }
+    }
+  }
+
+  private getOperation(action: 'add' | 'modify' | 'remove'): chrome.declarativeNetRequest.HeaderOperation {
+    switch (action) {
+      case 'add':
+        return chrome.declarativeNetRequest.HeaderOperation.APPEND
+      case 'modify':
+        return chrome.declarativeNetRequest.HeaderOperation.SET
+      case 'remove':
+        return chrome.declarativeNetRequest.HeaderOperation.REMOVE
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
diff --git a/src/services/headerRuleStorage.ts b/src/services/headerRuleStorage.ts
new file mode 100644
index 0000000..5c0b98c
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
diff --git a/src/types/headerRule.ts b/src/types/headerRule.ts
new file mode 100644
index 0000000..5bb57b7
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
diff --git a/src/types/index.ts b/src/types/index.ts
index 4d17613..7f1f3c9 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -53,10 +53,12 @@ export interface StorageItem {
   key: string
   value: string
 }
 
 export interface StorageClipboardItem {
   items: StorageItem[]
   sourceDomain: string
   storageType: 'local' | 'session'
   copiedAt: number
 }
+
+export * from './headerRule'
