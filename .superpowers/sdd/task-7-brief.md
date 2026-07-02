# Task 7: Content Script主入口

**Context:** This task creates the content script that bridges the extension and the injected script. It runs in extension context and injects the page script.

**Files:**
- Create: `src/content/index.ts`

**Interfaces:**
- Consumes: `INJECTED_SCRIPT` from Task 6
- Produces: Script injection, background communication, rule updates

---

## Steps

- [ ] **Step 1: 创建Content Script主入口**

```typescript
// src/content/index.ts

import { INJECTED_SCRIPT } from './injectedScript'

// 注入脚本到页面上下文
function injectScript(): void {
  const script = document.createElement('script')
  script.textContent = INJECTED_SCRIPT
  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
}

// 从background获取规则
async function fetchRules(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRequestRewriteRules' })
    if (response?.success && response?.data) {
      // 发送规则到注入脚本
      window.postMessage({
        type: 'REQUEST_REWRITE_CONFIG',
        rules: response.data.rules,
        variables: response.data.variables
      }, '*')
    }
  } catch (e) {
    console.error('[ContentScript] Failed to fetch rules:', e)
  }
}

// 监听来自注入脚本的请求
window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.data.type === 'REQUEST_REWRITE_GET_CONFIG') {
    fetchRules()
  }
})

// 监听来自background的规则更新
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'REQUEST_REWRITE_RULES_UPDATED') {
    fetchRules()
  }
})

// 初始化
injectScript()
console.log('[ContentScript] RequestRewrite content script loaded')
```

- [ ] **Step 2: 提交**

```bash
git add src/content/index.ts
git commit -m "feat: add content script main entry"
```

---

**Global Constraints:**
- Content Script必须在document_start注入
- 错误处理：单步失败跳过继续，不中断用户请求
- 变量引用语法：{{varName}}
