# Task 1 Review Package

## Commit History
```
aed8feb feat: add RequestRewrite and Variable type definitions
```

## Diff Stats
```
 src/types/index.ts                      |   6 +-
 src/types/requestRewrite.ts             | 102 +++++++++++++
 src/types/variable.ts                   |  24 +++
 tests/unit/types/requestRewrite.test.ts | 257 ++++++++++++++++++++++++++++++++
 tests/unit/types/variable.test.ts       | 103 +++++++++++++
 5 files changed, 491 insertions(+), 1 deletion(-)
```

## Full Diff
diff --git a/src/types/index.ts b/src/types/index.ts
index e5088c5..5fb0b86 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -29,20 +29,24 @@ export interface Settings {
   theme: 'light' | 'dark'
   maxClipboardItems: number
 }
 
 export type CookieAttribute = 'secure' | 'httpOnly' | 'session'
 
 // Import header rule types for use in MessagePayload
 import type { HeaderProfile } from './headerRule'
 export * from './headerRule'
 
+// Import new RequestRewrite and Variable types
+export * from './requestRewrite'
+export * from './variable'
+
 export interface MessagePayload {
   action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings' | 'getStorage' | 'setStorageItem' | 'removeStorageItem' | 'setStorageItems' | 'removeStorageItems' | 'getStorageClipboard' | 'setStorageClipboard' | 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles'
   data?: unknown
   tabId?: number
   storageType?: 'local' | 'session'
   key?: string
   value?: string
   items?: { key: string; value: string }[]
   keys?: string[]
   profiles?: HeaderProfile[]
@@ -61,11 +65,11 @@ export interface MessageResponse<T = unknown> {
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
diff --git a/src/types/requestRewrite.ts b/src/types/requestRewrite.ts
new file mode 100644
index 0000000..dcb2a87
--- /dev/null
+++ b/src/types/requestRewrite.ts
@@ -0,0 +1,102 @@
+// src/types/requestRewrite.ts
+
+import type { HttpMethod, HeaderTarget } from './headerRule'
+
+// Re-export types from headerRule.ts that are reused
+export type { HttpMethod, HeaderTarget } from './headerRule'
+
+/**
+ * Methods for body rewriting
+ */
+export type BodyRewriteMethod = 'text' | 'jsonPath' | 'regex' | 'script'
+
+/**
+ * HeaderRuleAction - Defines a single header modification action
+ */
+export interface HeaderRuleAction {
+  action: 'add' | 'modify' | 'remove'
+  headerName: string
+  headerValue: string
+}
+
+/**
+ * BodyRewriteAction - Defines a single body rewrite operation
+ *
+ * - text: Simple text find/replace
+ * - jsonPath: JSONPath-based value replacement
+ * - regex: Regular expression-based replacement
+ * - script: Custom JavaScript for body transformation
+ */
+export interface BodyRewriteAction {
+  method: BodyRewriteMethod
+  // text method
+  find?: string
+  replace?: string
+  // jsonPath method
+  path?: string
+  value?: string
+  // regex method
+  pattern?: string
+  replacement?: string
+  // script method
+  scriptBody?: string
+}
+
+/**
+ * RequestRewriteRule - A complete rewrite rule
+ *
+ * Supports multiple header actions and body rewrites that execute in order.
+ */
+export interface RequestRewriteRule {
+  id: string
+  enabled: boolean
+  name: string
+  urlPattern: string
+  methods: HttpMethod[]
+  target: HeaderTarget
+  headers: HeaderRuleAction[]
+  bodyRewrites: BodyRewriteAction[]
+}
+
+/**
+ * RequestRewriteProfile - A collection of rewrite rules
+ */
+export interface RequestRewriteProfile {
+  id: string
+  name: string
+  enabled: boolean
+  rules: RequestRewriteRule[]
+}
+
+/**
+ * LegacyHeaderRule - Old single-action header rule format (for migration)
+ */
+export interface LegacyHeaderRule {
+  id: string
+  enabled: boolean
+  name: string
+  urlPattern: string
+  methods: HttpMethod[]
+  action: 'add' | 'modify' | 'remove'
+  headerName: string
+  headerValue: string
+  target: HeaderTarget
+}
+
+/**
+ * LegacyHeaderProfile - Old profile format (for migration)
+ */
+export interface LegacyHeaderProfile {
+  id: string
+  name: string
+  enabled: boolean
+  rules: LegacyHeaderRule[]
+}
+
+/**
+ * RequestRewriteProfilesExport - Export format for profiles
+ */
+export interface RequestRewriteProfilesExport {
+  version: string
+  profiles: RequestRewriteProfile[]
+}
\ No newline at end of file
diff --git a/src/types/variable.ts b/src/types/variable.ts
new file mode 100644
index 0000000..da819a6
--- /dev/null
+++ b/src/types/variable.ts
@@ -0,0 +1,24 @@
+// src/types/variable.ts
+
+/**
+ * PresetVariable - A variable with a static value defined by the user
+ */
+export interface PresetVariable {
+  name: string
+  value: string
+  description?: string
+}
+
+/**
+ * AutoExtractVariable - A variable that extracts its value from browser storage
+ */
+export interface AutoExtractVariable {
+  name: string
+  source: 'localStorage' | 'sessionStorage' | 'cookie' | 'meta'
+  key: string
+}
+
+/**
+ * Variable - Union type for all variable types
+ */
+export type Variable = PresetVariable | AutoExtractVariable
diff --git a/tests/unit/types/requestRewrite.test.ts b/tests/unit/types/requestRewrite.test.ts
new file mode 100644
index 0000000..362fafb
--- /dev/null
+++ b/tests/unit/types/requestRewrite.test.ts
@@ -0,0 +1,257 @@
+// tests/unit/types/requestRewrite.test.ts
+import { describe, it, expect } from 'vitest'
+import type {
+  RequestRewriteRule,
+  HeaderRuleAction,
+  BodyRewriteAction,
+  RequestRewriteProfile,
+  LegacyHeaderRule,
+  LegacyHeaderProfile,
+  HttpMethod,
+  HeaderTarget,
+  BodyRewriteMethod
+} from '@/types/requestRewrite'
+
+describe('RequestRewrite Types', () => {
+  describe('HttpMethod', () => {
+    it('should accept valid HTTP methods', () => {
+      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ALL']
+      expect(methods).toHaveLength(8)
+    })
+  })
+
+  describe('HeaderTarget', () => {
+    it('should accept valid header targets', () => {
+      const targets: HeaderTarget[] = ['request', 'response']
+      expect(targets).toHaveLength(2)
+    })
+  })
+
+  describe('BodyRewriteMethod', () => {
+    it('should accept valid body rewrite methods', () => {
+      const methods: BodyRewriteMethod[] = ['text', 'jsonPath', 'regex', 'script']
+      expect(methods).toHaveLength(4)
+    })
+  })
+
+  describe('HeaderRuleAction', () => {
+    it('should create a valid add header action', () => {
+      const action: HeaderRuleAction = {
+        action: 'add',
+        headerName: 'X-Custom-Header',
+        headerValue: 'custom-value'
+      }
+      expect(action.action).toBe('add')
+      expect(action.headerName).toBe('X-Custom-Header')
+      expect(action.headerValue).toBe('custom-value')
+    })
+
+    it('should create a valid modify header action', () => {
+      const action: HeaderRuleAction = {
+        action: 'modify',
+        headerName: 'Authorization',
+        headerValue: 'Bearer token123'
+      }
+      expect(action.action).toBe('modify')
+    })
+
+    it('should create a valid remove header action', () => {
+      const action: HeaderRuleAction = {
+        action: 'remove',
+        headerName: 'X-Remove-Header',
+        headerValue: ''
+      }
+      expect(action.action).toBe('remove')
+    })
+  })
+
+  describe('BodyRewriteAction', () => {
+    it('should create a text replacement action', () => {
+      const action: BodyRewriteAction = {
+        method: 'text',
+        find: 'old-value',
+        replace: 'new-value'
+      }
+      expect(action.method).toBe('text')
+      expect(action.find).toBe('old-value')
+      expect(action.replace).toBe('new-value')
+    })
+
+    it('should create a jsonPath action', () => {
+      const action: BodyRewriteAction = {
+        method: 'jsonPath',
+        path: '$.data.name',
+        value: 'updated-name'
+      }
+      expect(action.method).toBe('jsonPath')
+      expect(action.path).toBe('$.data.name')
+      expect(action.value).toBe('updated-name')
+    })
+
+    it('should create a regex action', () => {
+      const action: BodyRewriteAction = {
+        method: 'regex',
+        pattern: '\\d{4}',
+        replacement: 'XXXX'
+      }
+      expect(action.method).toBe('regex')
+      expect(action.pattern).toBe('\\d{4}')
+      expect(action.replacement).toBe('XXXX')
+    })
+
+    it('should create a script action', () => {
+      const action: BodyRewriteAction = {
+        method: 'script',
+        scriptBody: 'return body.replace(/old/g, "new")'
+      }
+      expect(action.method).toBe('script')
+      expect(action.scriptBody).toBe('return body.replace(/old/g, "new")')
+    })
+  })
+
+  describe('RequestRewriteRule', () => {
+    it('should create a valid rule with header actions', () => {
+      const rule: RequestRewriteRule = {
+        id: 'rule-1',
+        enabled: true,
+        name: 'Add Custom Header',
+        urlPattern: '*://api.example.com/*',
+        methods: ['GET', 'POST'],
+        target: 'request',
+        headers: [
+          { action: 'add', headerName: 'X-Custom', headerValue: 'value' }
+        ],
+        bodyRewrites: []
+      }
+      expect(rule.id).toBe('rule-1')
+      expect(rule.enabled).toBe(true)
+      expect(rule.headers).toHaveLength(1)
+      expect(rule.bodyRewrites).toHaveLength(0)
+    })
+
+    it('should create a valid rule with body rewrites', () => {
+      const rule: RequestRewriteRule = {
+        id: 'rule-2',
+        enabled: true,
+        name: 'Rewrite Response Body',
+        urlPattern: '*://api.example.com/*',
+        methods: ['ALL'],
+        target: 'response',
+        headers: [],
+        bodyRewrites: [
+          { method: 'text', find: 'staging', replace: 'production' }
+        ]
+      }
+      expect(rule.bodyRewrites).toHaveLength(1)
+    })
+
+    it('should create a rule with multiple header and body actions', () => {
+      const rule: RequestRewriteRule = {
+        id: 'rule-3',
+        enabled: true,
+        name: 'Complex Rule',
+        urlPattern: '*://example.com/*',
+        methods: ['GET', 'POST', 'PUT'],
+        target: 'response',
+        headers: [
+          { action: 'add', headerName: 'X-Header-1', headerValue: 'value1' },
+          { action: 'modify', headerName: 'X-Header-2', headerValue: 'value2' },
+          { action: 'remove', headerName: 'X-Header-3', headerValue: '' }
+        ],
+        bodyRewrites: [
+          { method: 'jsonPath', path: '$.status', value: 'success' },
+          { method: 'text', find: 'error', replace: 'warning' }
+        ]
+      }
+      expect(rule.headers).toHaveLength(3)
+      expect(rule.bodyRewrites).toHaveLength(2)
+    })
+  })
+
+  describe('RequestRewriteProfile', () => {
+    it('should create a valid profile', () => {
+      const profile: RequestRewriteProfile = {
+        id: 'profile-1',
+        name: 'Test Profile',
+        enabled: true,
+        rules: []
+      }
+      expect(profile.id).toBe('profile-1')
+      expect(profile.name).toBe('Test Profile')
+      expect(profile.enabled).toBe(true)
+      expect(profile.rules).toHaveLength(0)
+    })
+
+    it('should create a profile with rules', () => {
+      const profile: RequestRewriteProfile = {
+        id: 'profile-2',
+        name: 'API Profile',
+        enabled: true,
+        rules: [
+          {
+            id: 'rule-1',
+            enabled: true,
+            name: 'Rule 1',
+            urlPattern: '*://api1.com/*',
+            methods: ['ALL'],
+            target: 'request',
+            headers: [],
+            bodyRewrites: []
+          },
+          {
+            id: 'rule-2',
+            enabled: false,
+            name: 'Rule 2',
+            urlPattern: '*://api2.com/*',
+            methods: ['POST'],
+            target: 'response',
+            headers: [],
+            bodyRewrites: []
+          }
+        ]
+      }
+      expect(profile.rules).toHaveLength(2)
+      expect(profile.rules[1].enabled).toBe(false)
+    })
+  })
+
+  describe('Legacy Types (for migration)', () => {
+    it('should create a valid LegacyHeaderRule', () => {
+      const legacyRule: LegacyHeaderRule = {
+        id: 'legacy-1',
+        enabled: true,
+        name: 'Legacy Rule',
+        urlPattern: '*://legacy.com/*',
+        methods: ['GET'],
+        action: 'add',
+        headerName: 'X-Legacy',
+        headerValue: 'legacy-value',
+        target: 'request'
+      }
+      expect(legacyRule.action).toBe('add')
+      expect(legacyRule.headerName).toBe('X-Legacy')
+    })
+
+    it('should create a valid LegacyHeaderProfile', () => {
+      const legacyProfile: LegacyHeaderProfile = {
+        id: 'legacy-profile-1',
+        name: 'Legacy Profile',
+        enabled: true,
+        rules: [
+          {
+            id: 'legacy-1',
+            enabled: true,
+            name: 'Legacy Rule',
+            urlPattern: '*://legacy.com/*',
+            methods: ['GET'],
+            action: 'add',
+            headerName: 'X-Legacy',
+            headerValue: 'value',
+            target: 'request'
+          }
+        ]
+      }
+      expect(legacyProfile.rules).toHaveLength(1)
+    })
+  })
+})
diff --git a/tests/unit/types/variable.test.ts b/tests/unit/types/variable.test.ts
new file mode 100644
index 0000000..f9cfe19
--- /dev/null
+++ b/tests/unit/types/variable.test.ts
@@ -0,0 +1,103 @@
+// tests/unit/types/variable.test.ts
+import { describe, it, expect } from 'vitest'
+import type {
+  PresetVariable,
+  AutoExtractVariable,
+  Variable
+} from '@/types/variable'
+
+describe('Variable Types', () => {
+  describe('PresetVariable', () => {
+    it('should create a preset variable with required fields', () => {
+      const variable: PresetVariable = {
+        name: 'apiToken',
+        value: 'bearer-token-123'
+      }
+      expect(variable.name).toBe('apiToken')
+      expect(variable.value).toBe('bearer-token-123')
+      expect(variable.description).toBeUndefined()
+    })
+
+    it('should create a preset variable with description', () => {
+      const variable: PresetVariable = {
+        name: 'apiKey',
+        value: 'sk-12345',
+        description: 'API Key for external service'
+      }
+      expect(variable.description).toBe('API Key for external service')
+    })
+  })
+
+  describe('AutoExtractVariable', () => {
+    it('should create a localStorage auto-extract variable', () => {
+      const variable: AutoExtractVariable = {
+        name: 'sessionId',
+        source: 'localStorage',
+        key: 'session_id'
+      }
+      expect(variable.name).toBe('sessionId')
+      expect(variable.source).toBe('localStorage')
+      expect(variable.key).toBe('session_id')
+    })
+
+    it('should create a sessionStorage auto-extract variable', () => {
+      const variable: AutoExtractVariable = {
+        name: 'tempToken',
+        source: 'sessionStorage',
+        key: 'temp_token'
+      }
+      expect(variable.source).toBe('sessionStorage')
+    })
+
+    it('should create a cookie auto-extract variable', () => {
+      const variable: AutoExtractVariable = {
+        name: 'authCookie',
+        source: 'cookie',
+        key: 'auth_token'
+      }
+      expect(variable.source).toBe('cookie')
+    })
+
+    it('should create a meta auto-extract variable', () => {
+      const variable: AutoExtractVariable = {
+        name: 'csrfToken',
+        source: 'meta',
+        key: 'csrf-token'
+      }
+      expect(variable.source).toBe('meta')
+    })
+  })
+
+  describe('Variable union type', () => {
+    it('should accept a PresetVariable as Variable', () => {
+      const variable: Variable = {
+        name: 'presetVar',
+        value: 'preset-value'
+      }
+      expect(variable.name).toBe('presetVar')
+    })
+
+    it('should accept an AutoExtractVariable as Variable', () => {
+      const variable: Variable = {
+        name: 'autoVar',
+        source: 'localStorage',
+        key: 'auto_key'
+      }
+      expect(variable.name).toBe('autoVar')
+    })
+
+    it('should differentiate between variable types', () => {
+      const preset: Variable = { name: 'p', value: 'v' }
+      const auto: Variable = { name: 'a', source: 'cookie', key: 'k' }
+
+      // Type guard to check if it's a PresetVariable
+      const isPreset = (v: Variable): v is PresetVariable => 'value' in v
+      const isAuto = (v: Variable): v is AutoExtractVariable => 'source' in v
+
+      expect(isPreset(preset)).toBe(true)
+      expect(isAuto(preset)).toBe(false)
+      expect(isPreset(auto)).toBe(false)
+      expect(isAuto(auto)).toBe(true)
+    })
+  })
+})
\ No newline at end of file
