# Task 6: 注入脚本（拦截fetch/XHR）

**Context:** This task creates the script that gets injected into page context to intercept fetch and XMLHttpRequest for body rewriting. The script runs in an isolated function that cannot use imports.

**Files:**
- Create: `src/content/injectedScript.ts`

**Interfaces:**
- Consumes: Logic patterns from Task 5 (bodyRewriter)
- Produces: `INJECTED_SCRIPT` string constant for injection

**Important:** This script runs in page context, NOT extension context. It must be self-contained with no imports. All functions must be inline.

---

## Steps

- [ ] **Step 1: 创建注入脚本**

The script must:
1. Listen for `message` events from content script to receive rules/variables
2. Intercept `window.fetch` to rewrite request body and response body
3. Intercept `window.XMLHttpRequest` to rewrite request body and response body
4. Apply URL pattern matching to find applicable rules
5. Handle errors gracefully (continue, don't interrupt)

Key implementation details:
- Use `window.postMessage` for communication with content script
- Store rules and variables in module-level variables
- Create RewritableResponse pattern for response body interception
- URL pattern matching: support wildcards like `*://api.example.com/*`

```typescript
// src/content/injectedScript.ts

// This file exports a string constant that will be injected into page context
// Note: Cannot use imports - all code must be inline

export const INJECTED_SCRIPT = `
(function() {
  'use strict'
  
  // Rules and variables storage
  let currentRules = []
  let variableMap = new Map()
  
  // Listen for config from content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return
    if (event.data.type === 'REQUEST_REWRITE_CONFIG') {
      currentRules = event.data.rules || []
      variableMap = new Map(Object.entries(event.data.variables || {}))
    }
  })
  
  // Request config
  window.postMessage({ type: 'REQUEST_REWRITE_GET_CONFIG' }, '*')
  
  // Variable resolution
  function applyVariables(value) {
    return value.replace(/\\{\\{(\\w+)\\}\\}/g, function(_, name) {
      return variableMap.get(name) || ''
    })
  }
  
  // ... (full implementation per plan spec)
  
  // Intercept fetch
  var originalFetch = window.fetch
  window.fetch = function(input, init) {
    // Apply request rewriting
    // Return modified response
  }
  
  // Intercept XMLHttpRequest
  var OriginalXHR = window.XMLHttpRequest
  window.XMLHttpRequest = function() {
    // Apply request rewriting
    // Intercept response
  }
  
  console.log('[RequestRewrite] Injected script loaded')
})()
`
```

- [ ] **Step 2: 提交**

```bash
git add src/content/injectedScript.ts
git commit -m "feat: add injected script for fetch/XHR interception"
```

---

**Global Constraints:**
- Content Script必须在document_start注入
- 错误处理：单步失败跳过继续，不中断用户请求
- 变量引用语法：{{varName}}
