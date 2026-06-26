# Task 2 Review Package

## Commit History
```
86b6d08 feat: add data migration service for RequestRewrite
```

## Diff Stats
```
 src/services/dataMigration.ts             |  72 +++++++
 tests/unit/services/dataMigration.test.ts | 313 ++++++++++++++++++++++++++++++
 2 files changed, 385 insertions(+)
```

## Full Diff
diff --git a/src/services/dataMigration.ts b/src/services/dataMigration.ts
new file mode 100644
index 0000000..b7c66b6
--- /dev/null
+++ b/src/services/dataMigration.ts
@@ -0,0 +1,72 @@
+// src/services/dataMigration.ts
+
+import type { LegacyHeaderRule, LegacyHeaderProfile, RequestRewriteRule, RequestRewriteProfile } from '@/types'
+
+const STORAGE_VERSION_KEY = 'rewriteStorageVersion'
+const CURRENT_VERSION = 2
+
+/**
+ * Migrate a single LegacyHeaderRule to RequestRewriteRule format
+ */
+export function migrateRule(old: LegacyHeaderRule): RequestRewriteRule {
+  return {
+    id: old.id,
+    enabled: old.enabled,
+    name: old.name,
+    urlPattern: old.urlPattern,
+    methods: old.methods,
+    target: old.target,
+    headers: [{
+      action: old.action,
+      headerName: old.headerName,
+      headerValue: old.headerValue
+    }],
+    bodyRewrites: []
+  }
+}
+
+/**
+ * Migrate a LegacyHeaderProfile to RequestRewriteProfile format
+ */
+export function migrateProfile(old: LegacyHeaderProfile): RequestRewriteProfile {
+  return {
+    id: old.id,
+    name: old.name,
+    enabled: old.enabled,
+    rules: old.rules.map(migrateRule)
+  }
+}
+
+/**
+ * Check storage version and perform migration if needed
+ * @returns true if migration was performed, false otherwise
+ */
+export async function checkAndMigrate(): Promise<boolean> {
+  const result = await chrome.storage.local.get([STORAGE_VERSION_KEY, 'headerProfiles'])
+  const version = result[STORAGE_VERSION_KEY] || 1
+
+  if (version >= CURRENT_VERSION) {
+    return false // No migration needed
+  }
+
+  // No profiles to migrate
+  if (!result.headerProfiles) {
+    return false
+  }
+
+  console.log('[Migration] Starting migration from v' + version + ' to v' + CURRENT_VERSION)
+
+  if (version < 2 && result.headerProfiles) {
+    const oldProfiles = result.headerProfiles as LegacyHeaderProfile[]
+    const newProfiles = oldProfiles.map(migrateProfile)
+
+    await chrome.storage.local.set({
+      headerProfiles: newProfiles,
+      [STORAGE_VERSION_KEY]: CURRENT_VERSION
+    })
+
+    console.log('[Migration] Migrated', newProfiles.length, 'profiles to v2')
+  }
+
+  return true
+}
\ No newline at end of file
diff --git a/tests/unit/services/dataMigration.test.ts b/tests/unit/services/dataMigration.test.ts
new file mode 100644
index 0000000..6dc2a70
--- /dev/null
+++ b/tests/unit/services/dataMigration.test.ts
@@ -0,0 +1,313 @@
+// tests/unit/services/dataMigration.test.ts
+import { describe, it, expect, vi, beforeEach } from 'vitest'
+import { migrateRule, migrateProfile, checkAndMigrate } from '@/services/dataMigration'
+import type { LegacyHeaderRule, LegacyHeaderProfile } from '@/types'
+
+describe('dataMigration', () => {
+  beforeEach(() => {
+    vi.clearAllMocks()
+  })
+
+  describe('migrateRule', () => {
+    it('should migrate a single rule with all fields preserved', () => {
+      const oldRule: LegacyHeaderRule = {
+        id: 'rule-1',
+        enabled: true,
+        name: 'Add Auth',
+        urlPattern: '*://api.example.com/*',
+        methods: ['GET', 'POST'],
+        action: 'add',
+        headerName: 'Authorization',
+        headerValue: 'Bearer token123',
+        target: 'request'
+      }
+
+      const newRule = migrateRule(oldRule)
+
+      expect(newRule.id).toBe('rule-1')
+      expect(newRule.enabled).toBe(true)
+      expect(newRule.name).toBe('Add Auth')
+      expect(newRule.urlPattern).toBe('*://api.example.com/*')
+      expect(newRule.methods).toEqual(['GET', 'POST'])
+      expect(newRule.target).toBe('request')
+      expect(newRule.headers).toHaveLength(1)
+      expect(newRule.headers[0].action).toBe('add')
+      expect(newRule.headers[0].headerName).toBe('Authorization')
+      expect(newRule.headers[0].headerValue).toBe('Bearer token123')
+      expect(newRule.bodyRewrites).toHaveLength(0)
+    })
+
+    it('should migrate a modify action rule', () => {
+      const oldRule: LegacyHeaderRule = {
+        id: 'rule-2',
+        enabled: true,
+        name: 'Modify Origin',
+        urlPattern: '*://example.com/*',
+        methods: ['ALL'],
+        action: 'modify',
+        headerName: 'Origin',
+        headerValue: 'https://modified.com',
+        target: 'request'
+      }
+
+      const newRule = migrateRule(oldRule)
+
+      expect(newRule.headers[0].action).toBe('modify')
+      expect(newRule.headers[0].headerName).toBe('Origin')
+      expect(newRule.headers[0].headerValue).toBe('https://modified.com')
+    })
+
+    it('should migrate a remove action rule', () => {
+      const oldRule: LegacyHeaderRule = {
+        id: 'rule-3',
+        enabled: false,
+        name: 'Remove CSP',
+        urlPattern: '*://*/*',
+        methods: ['ALL'],
+        action: 'remove',
+        headerName: 'Content-Security-Policy',
+        headerValue: '',
+        target: 'response'
+      }
+
+      const newRule = migrateRule(oldRule)
+
+      expect(newRule.enabled).toBe(false)
+      expect(newRule.headers[0].action).toBe('remove')
+      expect(newRule.headers[0].headerName).toBe('Content-Security-Policy')
+      expect(newRule.headers[0].headerValue).toBe('')
+      expect(newRule.target).toBe('response')
+    })
+
+    it('should initialize bodyRewrites as empty array', () => {
+      const oldRule: LegacyHeaderRule = {
+        id: 'rule-4',
+        enabled: true,
+        name: 'Test Rule',
+        urlPattern: '*://*/*',
+        methods: ['GET'],
+        action: 'add',
+        headerName: 'X-Test',
+        headerValue: 'test',
+        target: 'request'
+      }
+
+      const newRule = migrateRule(oldRule)
+
+      expect(newRule.bodyRewrites).toEqual([])
+    })
+  })
+
+  describe('migrateProfile', () => {
+    it('should migrate a profile with multiple rules', () => {
+      const oldProfile: LegacyHeaderProfile = {
+        id: 'profile-1',
+        name: 'Test Profile',
+        enabled: true,
+        rules: [
+          {
+            id: 'rule-1',
+            enabled: true,
+            name: 'Rule 1',
+            urlPattern: '*://*/*',
+            methods: ['ALL'],
+            action: 'add',
+            headerName: 'X-Custom',
+            headerValue: 'value',
+            target: 'request'
+          },
+          {
+            id: 'rule-2',
+            enabled: false,
+            name: 'Rule 2',
+            urlPattern: '*://api.*/*',
+            methods: ['GET', 'POST'],
+            action: 'modify',
+            headerName: 'Authorization',
+            headerValue: 'Bearer token',
+            target: 'request'
+          }
+        ]
+      }
+
+      const newProfile = migrateProfile(oldProfile)
+
+      expect(newProfile.id).toBe('profile-1')
+      expect(newProfile.name).toBe('Test Profile')
+      expect(newProfile.enabled).toBe(true)
+      expect(newProfile.rules).toHaveLength(2)
+      expect(newProfile.rules[0].headers).toHaveLength(1)
+      expect(newProfile.rules[0].headers[0].headerName).toBe('X-Custom')
+      expect(newProfile.rules[1].headers[0].headerName).toBe('Authorization')
+    })
+
+    it('should migrate a profile with empty rules', () => {
+      const oldProfile: LegacyHeaderProfile = {
+        id: 'profile-empty',
+        name: 'Empty Profile',
+        enabled: false,
+        rules: []
+      }
+
+      const newProfile = migrateProfile(oldProfile)
+
+      expect(newProfile.id).toBe('profile-empty')
+      expect(newProfile.name).toBe('Empty Profile')
+      expect(newProfile.enabled).toBe(false)
+      expect(newProfile.rules).toHaveLength(0)
+    })
+  })
+
+  describe('checkAndMigrate', () => {
+    it('should return false when already at current version', async () => {
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        rewriteStorageVersion: 2
+      })
+
+      const result = await checkAndMigrate()
+
+      expect(result).toBe(false)
+      expect(chrome.storage.local.set).not.toHaveBeenCalled()
+    })
+
+    it('should return false when version is higher than current', async () => {
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        rewriteStorageVersion: 3
+      })
+
+      const result = await checkAndMigrate()
+
+      expect(result).toBe(false)
+    })
+
+    it('should migrate from v1 to v2', async () => {
+      const oldProfiles: LegacyHeaderProfile[] = [
+        {
+          id: 'profile-1',
+          name: 'Test Profile',
+          enabled: true,
+          rules: [
+            {
+              id: 'rule-1',
+              enabled: true,
+              name: 'Add Auth',
+              urlPattern: '*://api.example.com/*',
+              methods: ['GET'],
+              action: 'add',
+              headerName: 'Authorization',
+              headerValue: 'Bearer token',
+              target: 'request'
+            }
+          ]
+        }
+      ]
+
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        rewriteStorageVersion: 1,
+        headerProfiles: oldProfiles
+      })
+
+      const result = await checkAndMigrate()
+
+      expect(result).toBe(true)
+      expect(chrome.storage.local.set).toHaveBeenCalled()
+
+      const setCall = vi.mocked(chrome.storage.local.set).mock.calls[0][0]
+      expect(setCall.rewriteStorageVersion).toBe(2)
+      expect(setCall.headerProfiles).toHaveLength(1)
+      expect(setCall.headerProfiles[0].rules[0].headers).toHaveLength(1)
+    })
+
+    it('should migrate when no version key exists (defaults to v1)', async () => {
+      const oldProfiles: LegacyHeaderProfile[] = [
+        {
+          id: 'profile-1',
+          name: 'Legacy Profile',
+          enabled: true,
+          rules: []
+        }
+      ]
+
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        headerProfiles: oldProfiles
+      })
+
+      const result = await checkAndMigrate()
+
+      expect(result).toBe(true)
+      expect(chrome.storage.local.set).toHaveBeenCalled()
+    })
+
+    it('should do nothing when no headerProfiles exist', async () => {
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        rewriteStorageVersion: 1
+      })
+
+      const result = await checkAndMigrate()
+
+      expect(result).toBe(false)
+      expect(chrome.storage.local.set).not.toHaveBeenCalled()
+    })
+
+    it('should preserve profile data during migration', async () => {
+      const oldProfiles: LegacyHeaderProfile[] = [
+        {
+          id: 'profile-abc',
+          name: 'My Production Profile',
+          enabled: true,
+          rules: [
+            {
+              id: 'rule-xyz',
+              enabled: true,
+              name: 'API Auth',
+              urlPattern: '*://api.myapp.com/*',
+              methods: ['GET', 'POST', 'PUT', 'DELETE'],
+              action: 'modify',
+              headerName: 'X-API-Key',
+              headerValue: 'secret-key-123',
+              target: 'request'
+            },
+            {
+              id: 'rule-xyz-2',
+              enabled: false,
+              name: 'Debug Header',
+              urlPattern: '*://localhost/*',
+              methods: ['ALL'],
+              action: 'add',
+              headerName: 'X-Debug',
+              headerValue: 'true',
+              target: 'request'
+            }
+          ]
+        }
+      ]
+
+      vi.mocked(chrome.storage.local.get).mockResolvedValue({
+        rewriteStorageVersion: 1,
+        headerProfiles: oldProfiles
+      })
+
+      await checkAndMigrate()
+
+      const setCall = vi.mocked(chrome.storage.local.set).mock.calls[0][0]
+      const migratedProfiles = setCall.headerProfiles
+
+      expect(migratedProfiles[0].id).toBe('profile-abc')
+      expect(migratedProfiles[0].name).toBe('My Production Profile')
+      expect(migratedProfiles[0].enabled).toBe(true)
+      expect(migratedProfiles[0].rules).toHaveLength(2)
+
+      // First rule
+      expect(migratedProfiles[0].rules[0].id).toBe('rule-xyz')
+      expect(migratedProfiles[0].rules[0].enabled).toBe(true)
+      expect(migratedProfiles[0].rules[0].urlPattern).toBe('*://api.myapp.com/*')
+      expect(migratedProfiles[0].rules[0].headers[0].action).toBe('modify')
+      expect(migratedProfiles[0].rules[0].headers[0].headerName).toBe('X-API-Key')
+      expect(migratedProfiles[0].rules[0].headers[0].headerValue).toBe('secret-key-123')
+
+      // Second rule
+      expect(migratedProfiles[0].rules[1].enabled).toBe(false)
+      expect(migratedProfiles[0].rules[1].headers[0].headerName).toBe('X-Debug')
+    })
+  })
+})
\ No newline at end of file
