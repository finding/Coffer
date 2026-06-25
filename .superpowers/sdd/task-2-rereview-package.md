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
index 4d17613..fa74c91 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -25,20 +25,22 @@ export interface CookieFilters {
 }
 
 export interface Settings {
   persistMode: boolean
   theme: 'light' | 'dark'
   maxClipboardItems: number
 }
 
 export type CookieAttribute = 'secure' | 'httpOnly' | 'session'
 
+export * from './headerRule'
+
 export interface MessagePayload {
   action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard'
   data?: unknown
   tabId?: number
   storageType?: 'local' | 'session'
   key?: string
   value?: string
   items?: { key: string; value: string }[]
   keys?: string[]
 }
