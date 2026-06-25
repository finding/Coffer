diff --git a/manifest.json b/manifest.json
index de6609c..49c1a75 100644
--- a/manifest.json
+++ b/manifest.json
@@ -3,21 +3,23 @@
   "name": "Coffer",
   "version": "1.0.3",
   "description": "A secure vault for your cookies and storage - manage, copy, paste across tabs and incognito mode",
   "permissions": [
     "cookies",
     "storage",
     "activeTab",
     "tabs",
     "scripting",
     "clipboardRead",
-    "clipboardWrite"
+    "clipboardWrite",
+    "declarativeNetRequest",
+    "declarativeNetRequestFeedback"
   ],
   "host_permissions": [
     "<all_urls>"
   ],
   "action": {
     "default_popup": "src/popup/index.html",
     "default_icon": {
       "16": "icons/icon16.png",
       "48": "icons/icon48.png",
       "128": "icons/icon128.png"
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
index 4d17613..7748cd0 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -1,10 +1,12 @@
+import type { HeaderProfile } from './headerRule'
+
 export interface CookieItem {
   name: string
   value: string
   domain: string
   path: string
   secure: boolean
   httpOnly: boolean
   sameSite: 'lax' | 'strict' | 'no_restriction'
   expirationDate?: number
   storeId: string
@@ -26,37 +28,44 @@ export interface CookieFilters {
 
 export interface Settings {
   persistMode: boolean
   theme: 'light' | 'dark'
   maxClipboardItems: number
 }
 
 export type CookieAttribute = 'secure' | 'httpOnly' | 'session'
 
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
 }
+
+export * from './headerRule'
