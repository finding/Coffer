diff --git a/src/background/index.ts b/src/background/index.ts
index ad91b60..62c5490 100644
--- a/src/background/index.ts
+++ b/src/background/index.ts
@@ -1,15 +1,18 @@
 import { storageService } from '@/services/storageService'
-import type { MessagePayload, MessageResponse, StorageItem } from '@/types'
+import { headerRuleStorage } from '@/services/headerRuleStorage'
+import { headerRuleService } from '@/services/headerRuleService'
+import type { MessagePayload, MessageResponse, StorageItem, HeaderProfile } from '@/types'
 
-chrome.runtime.onInstalled.addListener(() => {
+chrome.runtime.onInstalled.addListener(async () => {
   console.log('Coffer installed')
+  await headerRuleService.initialize()
 })
 
 chrome.cookies.onChanged.addListener((changeInfo) => {
   chrome.runtime.sendMessage({
     type: 'COOKIE_CHANGED',
     data: changeInfo
   }).catch(() => {})
 })
 
 chrome.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
@@ -50,20 +53,43 @@ async function handleMessage(message: MessagePayload): Promise<MessageResponse>
       await setStorageItems(message.tabId as number, message.storageType as 'local' | 'session', message.items as { key: string; value: string }[])
       return { success: true }
     case 'removeStorageItems':
       await removeStorageItems(message.tabId as number, message.storageType as 'local' | 'session', message.keys as string[])
       return { success: true }
     case 'getStorageClipboard':
       return { success: true, data: await getStorageClipboard(message.storageType as 'local' | 'session') }
     case 'setStorageClipboard':
       await setStorageClipboard(message.storageType as 'local' | 'session', message.data as StorageItem[])
       return { success: true }
+    case 'getHeaderProfiles':
+      return { success: true, data: await headerRuleStorage.getProfiles() }
+    case 'setHeaderProfiles':
+      await headerRuleStorage.saveProfiles(message.profiles as HeaderProfile[])
+      return { success: true }
+    case 'syncHeaderRules':
+      const profile = message.profileData as HeaderProfile | null
+      await headerRuleService.syncRulesToChrome(profile)
+      return { success: true }
+    case 'exportHeaderProfiles':
+      const exportProfiles = await headerRuleStorage.getProfiles()
+      return { success: true, data: JSON.stringify({ version: '1.0', profiles: exportProfiles }, null, 2) }
+    case 'importHeaderProfiles':
+      try {
+        const parsed = JSON.parse(message.jsonString as string)
+        if (parsed.version && Array.isArray(parsed.profiles)) {
+          await headerRuleStorage.saveProfiles(parsed.profiles)
+          return { success: true }
+        }
+        return { success: false, error: 'Invalid format' }
+      } catch {
+        return { success: false, error: 'Parse error' }
+      }
     default:
       return { success: false, error: 'Unknown action' }
   }
 }
 
 async function getStorage(tabId: number, type: 'local' | 'session'): Promise<{ key: string; value: string }[]> {
   console.log('[Background] getStorage called:', { tabId, type })
   try {
     const result = await chrome.scripting.executeScript({
       target: { tabId },
