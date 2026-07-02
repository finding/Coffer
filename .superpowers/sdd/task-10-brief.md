# Task 10: 更新Background

**Context:** This task updates the background service worker to handle new message types for RequestRewrite rules and variable retrieval.

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `requestRewriteStorage`, `variableStorage`
- Produces: Message handlers for `getRequestRewriteRules` and `requestRewriteRulesUpdated`

---

## Steps

- [ ] **Step 1: 添加新消息处理**

Add to existing background message handler:

```typescript
// In src/background/index.ts

import { requestRewriteStorage } from '@/services/requestRewriteStorage'
import { variableStorage } from '@/services/variableStorage'

// Add new case to message handler:
if (message.action === 'getRequestRewriteRules') {
  (async () => {
    try {
      const profile = await requestRewriteStorage.getActiveProfile()
      const presetVars = await variableStorage.getPresetVariables()
      
      const variables: Record<string, string> = {}
      for (const v of presetVars) {
        variables[v.name] = v.value
      }
      
      sendResponse({
        success: true,
        data: {
          rules: profile?.rules || [],
          variables
        }
      })
    } catch (e) {
      sendResponse({ success: false, error: String(e) })
    }
  })()
  return true // async response
}

if (message.action === 'requestRewriteRulesUpdated') {
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'REQUEST_REWRITE_RULES_UPDATED' }).catch(() => {})
      }
    }
  })
  sendResponse({ success: true })
  return false
}
```

- [ ] **Step 2: 提交**

```bash
git add src/background/index.ts
git commit -m "feat: add getRequestRewriteRules message handler in background"
```

---

**Global Constraints:**
- Background与content script通信
- 变量传递到注入脚本
