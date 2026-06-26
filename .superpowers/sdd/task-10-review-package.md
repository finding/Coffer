# Task 10 Review Package

## Commit History
```
7795827 feat: add getRequestRewriteRules message handler in background
```

## Diff Stats
```
 src/background/index.ts | 29 +++++++++++++++++++++++++++++
 src/types/index.ts      |  2 +-
 2 files changed, 30 insertions(+), 1 deletion(-)
```

## Full Diff
diff --git a/src/background/index.ts b/src/background/index.ts
index 62c5490..4acf315 100644
--- a/src/background/index.ts
+++ b/src/background/index.ts
@@ -1,13 +1,15 @@
 import { storageService } from '@/services/storageService'
 import { headerRuleStorage } from '@/services/headerRuleStorage'
 import { headerRuleService } from '@/services/headerRuleService'
+import { requestRewriteStorage } from '@/services/requestRewriteStorage'
+import { variableStorage } from '@/services/variableStorage'
 import type { MessagePayload, MessageResponse, StorageItem, HeaderProfile } from '@/types'
 
 chrome.runtime.onInstalled.addListener(async () => {
   console.log('Coffer installed')
   await headerRuleService.initialize()
 })
 
 chrome.cookies.onChanged.addListener((changeInfo) => {
   chrome.runtime.sendMessage({
     type: 'COOKIE_CHANGED',
@@ -76,20 +78,47 @@ async function handleMessage(message: MessagePayload): Promise<MessageResponse>
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
+    case 'getRequestRewriteRules': {
+      const profile = await requestRewriteStorage.getActiveProfile()
+      const presetVars = await variableStorage.getPresetVariables()
+
+      const variables: Record<string, string> = {}
+      for (const v of presetVars) {
+        variables[v.name] = v.value
+      }
+
+      return {
+        success: true,
+        data: {
+          rules: profile?.rules || [],
+          variables
+        }
+      }
+    }
+    case 'requestRewriteRulesUpdated':
+      // Broadcast to all tabs
+      chrome.tabs.query({}, (tabs) => {
+        for (const tab of tabs) {
+          if (tab.id) {
+            chrome.tabs.sendMessage(tab.id, { action: 'REQUEST_REWRITE_RULES_UPDATED' }).catch(() => {})
+          }
+        }
+      })
+      return { success: true }
     default:
       return { success: false, error: 'Unknown action' }
   }
 }
 
 async function getStorage(tabId: number, type: 'local' | 'session'): Promise<{ key: string; value: string }[]> {
   console.log('[Background] getStorage called:', { tabId, type })
   try {
     const result = await chrome.scripting.executeScript({
       target: { tabId },
diff --git a/src/types/index.ts b/src/types/index.ts
index 5fb0b86..21cb95a 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -34,21 +34,21 @@ export type CookieAttribute = 'secure' | 'httpOnly' | 'session'
 
 // Import header rule types for use in MessagePayload
 import type { HeaderProfile } from './headerRule'
 export * from './headerRule'
 
 // Import new RequestRewrite and Variable types
 export * from './requestRewrite'
 export * from './variable'
 
 export interface MessagePayload {
-  action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard' | 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles'
+  action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard' | 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles' | 'getRequestRewriteRules' | 'requestRewriteRulesUpdated'
   data?: unknown
   tabId?: number
   storageType?: 'local' | 'session'
   key?: string
   value?: string
   items?: { key: string; value: string }[]
   keys?: string[]
   profiles?: HeaderProfile[]
   profileId?: string
   ruleId?: string
