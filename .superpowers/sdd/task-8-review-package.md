# Task 8 Review Package

## Commit History
```
e930d81 feat: add RequestRewrite storage service
```

## Diff Stats
```
 src/services/requestRewriteStorage.ts | 56 +++++++++++++++++++++++++++++++++++
 1 file changed, 56 insertions(+)
```

## Full Diff
diff --git a/src/services/requestRewriteStorage.ts b/src/services/requestRewriteStorage.ts
new file mode 100644
index 0000000..6fd887e
--- /dev/null
+++ b/src/services/requestRewriteStorage.ts
@@ -0,0 +1,56 @@
+// src/services/requestRewriteStorage.ts
+
+import type { RequestRewriteProfile } from '@/types'
+import { checkAndMigrate } from './dataMigration'
+
+const PROFILES_KEY = 'headerProfiles' // 保持key不变，兼容迁移
+const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'
+
+const DEFAULT_PROFILE: RequestRewriteProfile = {
+  id: 'default',
+  name: 'Default',
+  enabled: true,
+  rules: []
+}
+
+export class RequestRewriteStorage {
+  async init(): Promise<void> {
+    await checkAndMigrate()
+  }
+
+  async getProfiles(): Promise<RequestRewriteProfile[]> {
+    const result = await chrome.storage.local.get(PROFILES_KEY)
+    const profiles = result[PROFILES_KEY]
+    if (!profiles || !Array.isArray(profiles)) {
+      return [DEFAULT_PROFILE]
+    }
+    return profiles
+  }
+
+  async saveProfiles(profiles: RequestRewriteProfile[]): Promise<void> {
+    const data = JSON.parse(JSON.stringify(profiles))
+    await chrome.storage.local.set({ [PROFILES_KEY]: data })
+    console.log('[RequestRewriteStorage] saved', profiles.length, 'profiles')
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
+  async getActiveProfile(): Promise<RequestRewriteProfile | null> {
+    const profiles = await this.getProfiles()
+    const activeId = await this.getActiveProfileId()
+    return profiles.find(p => p.id === activeId) ?? null
+  }
+}
+
+export const requestRewriteStorage = new RequestRewriteStorage()
