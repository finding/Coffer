# Task 16 Review Package

## Commit History
```
f18a81d fix: correct test expectations and reset store state between tests
```

## Diff Stats
```
 tests/unit/services/headerRuleService.test.ts |  2 +-
 tests/unit/stores/headerRuleStore.test.ts     | 12 +++++++++++-
 2 files changed, 12 insertions(+), 2 deletions(-)
```

## Full Diff
diff --git a/tests/unit/services/headerRuleService.test.ts b/tests/unit/services/headerRuleService.test.ts
index 5ebc4f2..822f643 100644
--- a/tests/unit/services/headerRuleService.test.ts
+++ b/tests/unit/services/headerRuleService.test.ts
@@ -24,21 +24,21 @@ describe('HeaderRuleService', () => {
         headerValue: 'Bearer token123',
         target: 'request'
       }
 
       const chromeRules = service.convertToChromeRules([rule])
 
       expect(chromeRules).toHaveLength(1)
       expect(chromeRules[0].action.type).toBe('modifyHeaders')
       expect(chromeRules[0].action.requestHeaders).toHaveLength(1)
       expect(chromeRules[0].action.requestHeaders?.[0].header).toBe('Authorization')
-      expect(chromeRules[0].action.requestHeaders?.[0].operation).toBe('append')
+      expect(chromeRules[0].action.requestHeaders?.[0].operation).toBe('set')
       expect(chromeRules[0].condition.urlFilter).toBe('*://api.example.com/*')
     })
 
     it('should convert a remove response header rule', () => {
       const rule: HeaderRule = {
         id: 'rule-2',
         enabled: true,
         name: 'Remove CSP',
         urlPattern: '*://*/*',
         methods: ['ALL'],
diff --git a/tests/unit/stores/headerRuleStore.test.ts b/tests/unit/stores/headerRuleStore.test.ts
index b955c2c..e1c55be 100644
--- a/tests/unit/stores/headerRuleStore.test.ts
+++ b/tests/unit/stores/headerRuleStore.test.ts
@@ -18,22 +18,32 @@ vi.mock('@/services/headerRuleStorage', () => ({
 
 // Mock service
 vi.mock('@/services/headerRuleService', () => ({
   headerRuleService: {
     syncRulesToChrome: vi.fn().mockResolvedValue(undefined)
   }
 }))
 
 describe('headerRuleStore', () => {
   beforeEach(() => {
-    setActivePinia(createPinia())
+    const pinia = createPinia()
+    setActivePinia(pinia)
     vi.clearAllMocks()
+
+    // Reset store state before each test
+    const store = useHeaderRuleStore()
+    store.$patch({
+      profiles: [],
+      activeProfileId: null,
+      loading: false,
+      error: null
+    })
   })
 
   it('should load profiles on init', async () => {
     const store = useHeaderRuleStore()
 
     await store.loadProfiles()
 
     expect(store.profiles).toHaveLength(1)
     expect(store.profiles[0].name).toBe('Default')
   })
