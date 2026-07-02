# Task 5: Body改写核心逻辑

**Context:** This task implements the core body rewriting logic supporting four methods: text, jsonPath, regex, and script. This module will be used by the injected script.

**Files:**
- Create: `src/content/bodyRewriter.ts`
- Create: `tests/unit/content/bodyRewriter.test.ts`

**Interfaces:**
- Consumes: `BodyRewriteAction` from Task 1
- Produces: `rewriteBody()`, `rewriteGetParams()`, `setVariableMap()`, `applyVariables()`

---

## Steps

- [ ] **Step 1: 创建Body改写核心模块**

```typescript
// src/content/bodyRewriter.ts

import type { BodyRewriteAction } from '@/types'

// 变量映射，由外部注入
let variableMap: Map<string, string> = new Map()

export function setVariableMap(map: Map<string, string>): void {
  variableMap = map
}

export function applyVariables(value: string): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return variableMap.get(name) || ''
  })
}

// 通过路径设置JSON值
function setByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  let current = obj
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part]) {
      current[part] = {}
    }
    current = current[part]
  }
  
  current[parts[parts.length - 1]] = value
}

// 单个改写操作
function applySingleRewrite(
  body: string, 
  rewrite: BodyRewriteAction, 
  url: string, 
  method: string
): string {
  try {
    switch (rewrite.method) {
      case 'text': {
        if (!rewrite.find) return body
        return body.replaceAll(rewrite.find, rewrite.replace || '')
      }
      
      case 'jsonPath': {
        if (!rewrite.path || !rewrite.value) return body
        const json = JSON.parse(body)
        const resolvedValue = applyVariables(rewrite.value)
        setByPath(json, rewrite.path, resolvedValue)
        return JSON.stringify(json)
      }
      
      case 'regex': {
        if (!rewrite.pattern) return body
        const regex = new RegExp(rewrite.pattern, 'g')
        return body.replace(regex, rewrite.replacement || '')
      }
      
      case 'script': {
        if (!rewrite.scriptBody) return body
        const modifyFn = new Function('body', 'url', 'method', rewrite.scriptBody)
        return modifyFn(body, url, method)
      }
      
      default:
        return body
    }
  } catch (e) {
    console.error('[BodyRewriter] Rewrite error:', e, rewrite)
    return body // 返回当前body，继续后续改写
  }
}

// 应用多个改写操作
export function rewriteBody(
  body: string, 
  rewrites: BodyRewriteAction[], 
  url: string, 
  method: string
): string {
  let currentBody = body
  
  for (const rewrite of rewrites) {
    currentBody = applySingleRewrite(currentBody, rewrite, url, method)
  }
  
  return currentBody
}

// GET参数改写
export function rewriteGetParams(
  url: string, 
  rewrites: BodyRewriteAction[]
): string {
  const [baseUrl, queryString] = url.split('?')
  if (!queryString) return url
  
  let currentQueryString = queryString
  
  for (const rewrite of rewrites) {
    try {
      switch (rewrite.method) {
        case 'text': {
          if (rewrite.find) {
            currentQueryString = currentQueryString.replaceAll(rewrite.find, rewrite.replace || '')
          }
          break
        }
        case 'regex': {
          if (rewrite.pattern) {
            const regex = new RegExp(rewrite.pattern, 'g')
            currentQueryString = currentQueryString.replace(regex, rewrite.replacement || '')
          }
          break
        }
        case 'jsonPath': {
          // jsonPath用于修改单个参数
          if (rewrite.path) {
            const params = new URLSearchParams(currentQueryString)
            if (params.has(rewrite.path)) {
              params.set(rewrite.path, applyVariables(rewrite.value || ''))
            }
            currentQueryString = params.toString()
          }
          break
        }
        case 'script': {
          if (rewrite.scriptBody) {
            const params = new URLSearchParams(currentQueryString)
            const modifyFn = new Function('params', 'url', rewrite.scriptBody)
            modifyFn(params, url)
            currentQueryString = params.toString()
          }
          break
        }
      }
    } catch (e) {
      console.error('[BodyRewriter] GET params rewrite error:', e, rewrite)
    }
  }
  
  return `${baseUrl}?${currentQueryString}`
}
```

- [ ] **Step 2: 添加单元测试**

```typescript
// tests/unit/content/bodyRewriter.test.ts

import { describe, it, expect } from 'vitest'
import { rewriteBody, rewriteGetParams, setVariableMap } from '@/content/bodyRewriter'
import type { BodyRewriteAction } from '@/types'

describe('bodyRewriter', () => {
  describe('rewriteBody', () => {
    it('should replace text', () => {
      const body = '{"status":0,"message":"error"}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'text', find: '"status":0', replace: '"status":1' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"status":1,"message":"error"}')
    })
    
    it('should modify jsonPath', () => {
      const body = '{"data":{"token":"old_token"}}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'jsonPath', path: 'data.token', value: 'new_token' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"data":{"token":"new_token"}}')
    })
    
    it('should apply regex replacement', () => {
      const body = '{"token":"abc123","name":"test"}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'regex', pattern: '"token":"[^"]*"', replacement: '"token":"xyz789"' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"token":"xyz789","name":"test"}')
    })
    
    it('should apply multiple rewrites in sequence', () => {
      const body = '{"status":0,"data":{"value":"old"}}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'text', find: '"status":0', replace: '"status":1' },
        { method: 'jsonPath', path: 'data.value', value: 'new' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"status":1,"data":{"value":"new"}}')
    })
    
    it('should continue on error', () => {
      const body = '{"status":0}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'jsonPath', path: 'invalid', value: 'test' }, // 会失败
        { method: 'text', find: '"status":0', replace: '"status":1' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"status":1}')
    })
  })
  
  describe('rewriteGetParams', () => {
    it('should rewrite query params with text', () => {
      const url = 'https://api.test.com?page=1&size=10'
      const rewrites: BodyRewriteAction[] = [
        { method: 'text', find: 'page=1', replace: 'page=2' }
      ]
      const result = rewriteGetParams(url, rewrites)
      expect(result).toBe('https://api.test.com?page=2&size=10')
    })
  })
  
  describe('variables', () => {
    it('should resolve variables in value', () => {
      setVariableMap(new Map([['myToken', 'secret123']]))
      const body = '{"token":"old"}'
      const rewrites: BodyRewriteAction[] = [
        { method: 'jsonPath', path: 'token', value: '{{myToken}}' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      expect(result).toBe('{"token":"secret123"}')
    })
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npm test tests/unit/content/bodyRewriter.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/content/bodyRewriter.ts tests/unit/content/bodyRewriter.test.ts
git commit -m "feat: add body rewriter core logic with tests"
```

---

**Global Constraints:**
- 错误处理：单步失败跳过继续，不中断用户请求
- 改写操作顺序执行
- 变量引用语法：{{varName}}
