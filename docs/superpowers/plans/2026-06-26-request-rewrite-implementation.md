# RequestRewrite 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展现有Headers改写功能，新增Body改写能力，支持请求/响应体的多种改写方式

**Architecture:** 混合架构 - Headers改写保持declarativeNetRequest API，Body改写使用Content Script注入拦截fetch/XHR，变量系统放在Settings面板

**Tech Stack:** Vue 3, TypeScript, Pinia, Chrome Extension Manifest V3, Content Scripts

## Global Constraints

- Tab名称统一变更：Headers → RequestRewrite（Popup、Manager、DevTools）
- 数据结构向后兼容，支持自动迁移旧数据
- 规则支持多个Header操作和多个Body改写操作叠加执行
- 变量支持预设变量和自动提取变量两种
- Content Script必须在document_start注入
- 错误处理：单步失败跳过继续，不中断用户请求
- UI使用Tailwind CSS，保持与现有风格一致

---

## File Structure

### New Files
- `src/types/requestRewrite.ts` - 新规则类型定义
- `src/types/variable.ts` - 变量类型定义
- `src/stores/variableStore.ts` - 变量管理store
- `src/services/variableStorage.ts` - 变量存储服务
- `src/services/dataMigration.ts` - 数据迁移服务
- `src/content/index.ts` - Content Script主入口
- `src/content/injectedScript.ts` - 注入页面拦截脚本
- `src/content/bodyRewriter.ts` - Body改写核心逻辑
- `src/services/requestRewriteStorage.ts` - 新存储服务（替代headerRuleStorage）

### Modified Files
- `src/types/index.ts` - 更新导出
- `src/stores/requestRewriteStore.ts` - 重命名并扩展（原headerRuleStore.ts）
- `src/manager/components/RequestRewriteManager.vue` - 重命名并扩展（原HeadersManager.vue）
- `src/popup/components/RequestRewriteTab.vue` - 重命名（原HeadersTab.vue）
- `src/popup/App.vue` - Tab名称变更
- `src/manager/App.vue` - Tab名称变更
- `src/devtools/App.vue` - Tab名称变更
- `src/manager/components/TabNav.vue` - Tab名称变更
- `src/popup/components/StatusCard.vue` - Tab名称变更
- `src/popup/components/QuickActions.vue` - Tab名称变更
- `src/devtools/components/RequestRewritePanel.vue` - 重命名（原HeadersPanel.vue）
- `src/devtools/components/SettingsPanel.vue` - 添加变量管理区域
- `manifest.json` - 添加content_scripts配置
- `src/background/index.ts` - 支持content script通信

---

## Task 1: 类型定义扩展

**Files:**
- Create: `src/types/requestRewrite.ts`
- Create: `src/types/variable.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `RequestRewriteRule`, `HeaderAction`, `BodyRewriteAction`, `RequestRewriteProfile`
- Produces: `PresetVariable`, `AutoExtractVariable`

- [ ] **Step 1: 创建变量类型定义**

```typescript
// src/types/variable.ts

export interface PresetVariable {
  name: string
  value: string
  description?: string
}

export interface AutoExtractVariable {
  name: string
  source: 'localStorage' | 'sessionStorage' | 'cookie' | 'meta'
  key: string
}

export type Variable = PresetVariable | AutoExtractVariable
```

- [ ] **Step 2: 创建规则类型定义**

```typescript
// src/types/requestRewrite.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'
export type HeaderTarget = 'request' | 'response'
export type BodyRewriteMethod = 'text' | 'jsonPath' | 'regex' | 'script'

export interface HeaderAction {
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
}

export interface BodyRewriteAction {
  method: BodyRewriteMethod
  // text
  find?: string
  replace?: string
  // jsonPath
  path?: string
  value?: string
  // regex
  pattern?: string
  replacement?: string
  // script
  scriptBody?: string
}

export interface RequestRewriteRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  target: HeaderTarget
  headers: HeaderAction[]
  bodyRewrites: BodyRewriteAction[]
}

export interface RequestRewriteProfile {
  id: string
  name: string
  enabled: boolean
  rules: RequestRewriteRule[]
}

// 旧数据结构（用于迁移）
export interface LegacyHeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
  target: HeaderTarget
}

export interface LegacyHeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: LegacyHeaderRule[]
}
```

- [ ] **Step 3: 更新类型导出**

```typescript
// src/types/index.ts

export * from './common'
export * from './requestRewrite'
export * from './variable'

// 向后兼容别名
export type { RequestRewriteRule as HeaderRule, RequestRewriteProfile as HeaderProfile } from './requestRewrite'
```

- [ ] **Step 4: 提交**

```bash
git add src/types/requestRewrite.ts src/types/variable.ts src/types/index.ts
git commit -m "feat: add RequestRewrite and Variable type definitions"
```

---

## Task 2: 数据迁移服务

**Files:**
- Create: `src/services/dataMigration.ts`

**Interfaces:**
- Consumes: `LegacyHeaderRule`, `LegacyHeaderProfile`, `RequestRewriteRule`, `RequestRewriteProfile` from Task 1
- Produces: `migrateRule()`, `migrateProfiles()`, `checkAndMigrate()`

- [ ] **Step 1: 创建数据迁移服务**

```typescript
// src/services/dataMigration.ts

import type { LegacyHeaderRule, LegacyHeaderProfile, RequestRewriteRule, RequestRewriteProfile } from '@/types'

const STORAGE_VERSION_KEY = 'rewriteStorageVersion'
const CURRENT_VERSION = 2

export function migrateRule(old: LegacyHeaderRule): RequestRewriteRule {
  return {
    id: old.id,
    enabled: old.enabled,
    name: old.name,
    urlPattern: old.urlPattern,
    methods: old.methods,
    target: old.target,
    headers: [{
      action: old.action,
      headerName: old.headerName,
      headerValue: old.headerValue
    }],
    bodyRewrites: []
  }
}

export function migrateProfile(old: LegacyHeaderProfile): RequestRewriteProfile {
  return {
    id: old.id,
    name: old.name,
    enabled: old.enabled,
    rules: old.rules.map(migrateRule)
  }
}

export async function checkAndMigrate(): Promise<boolean> {
  const result = await chrome.storage.local.get([STORAGE_VERSION_KEY, 'headerProfiles'])
  const version = result[STORAGE_VERSION_KEY] || 1
  
  if (version >= CURRENT_VERSION) {
    return false // 无需迁移
  }
  
  console.log('[Migration] Starting migration from v' + version + ' to v' + CURRENT_VERSION)
  
  if (version < 2 && result.headerProfiles) {
    const oldProfiles = result.headerProfiles as LegacyHeaderProfile[]
    const newProfiles = oldProfiles.map(migrateProfile)
    
    await chrome.storage.local.set({
      headerProfiles: newProfiles,
      [STORAGE_VERSION_KEY]: CURRENT_VERSION
    })
    
    console.log('[Migration] Migrated', newProfiles.length, 'profiles to v2')
  }
  
  return true
}
```

- [ ] **Step 2: 添加迁移测试**

```typescript
// tests/unit/services/dataMigration.test.ts

import { describe, it, expect } from 'vitest'
import { migrateRule, migrateProfile } from '@/services/dataMigration'
import type { LegacyHeaderRule, LegacyHeaderProfile } from '@/types'

describe('dataMigration', () => {
  it('should migrate a single rule', () => {
    const oldRule: LegacyHeaderRule = {
      id: 'rule-1',
      enabled: true,
      name: 'Add Auth',
      urlPattern: '*://api.example.com/*',
      methods: ['GET', 'POST'],
      action: 'add',
      headerName: 'Authorization',
      headerValue: 'Bearer token123',
      target: 'request'
    }
    
    const newRule = migrateRule(oldRule)
    
    expect(newRule.id).toBe('rule-1')
    expect(newRule.headers).toHaveLength(1)
    expect(newRule.headers[0].headerName).toBe('Authorization')
    expect(newRule.bodyRewrites).toHaveLength(0)
  })
  
  it('should migrate a profile with multiple rules', () => {
    const oldProfile: LegacyHeaderProfile = {
      id: 'profile-1',
      name: 'Test Profile',
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          enabled: true,
          name: 'Rule 1',
          urlPattern: '*://*/*',
          methods: ['ALL'],
          action: 'add',
          headerName: 'X-Custom',
          headerValue: 'value',
          target: 'request'
        }
      ]
    }
    
    const newProfile = migrateProfile(oldProfile)
    
    expect(newProfile.id).toBe('profile-1')
    expect(newProfile.rules).toHaveLength(1)
    expect(newProfile.rules[0].headers).toHaveLength(1)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npm test tests/unit/services/dataMigration.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/services/dataMigration.ts tests/unit/services/dataMigration.test.ts
git commit -m "feat: add data migration service for RequestRewrite"
```

---

## Task 3: 变量存储服务

**Files:**
- Create: `src/services/variableStorage.ts`

**Interfaces:**
- Consumes: `PresetVariable`, `AutoExtractVariable` from Task 1
- Produces: `getPresetVariables()`, `savePresetVariables()`, `getAutoExtractVariables()`, `saveAutoExtractVariables()`

- [ ] **Step 1: 创建变量存储服务**

```typescript
// src/services/variableStorage.ts

import type { PresetVariable, AutoExtractVariable } from '@/types'

const PRESET_VARS_KEY = 'presetVariables'
const AUTO_EXTRACT_VARS_KEY = 'autoExtractVariables'

export class VariableStorage {
  async getPresetVariables(): Promise<PresetVariable[]> {
    const result = await chrome.storage.local.get(PRESET_VARS_KEY)
    return result[PRESET_VARS_KEY] || []
  }

  async savePresetVariables(variables: PresetVariable[]): Promise<void> {
    await chrome.storage.local.set({ [PRESET_VARS_KEY]: variables })
  }

  async getAutoExtractVariables(): Promise<AutoExtractVariable[]> {
    const result = await chrome.storage.local.get(AUTO_EXTRACT_VARS_KEY)
    return result[AUTO_EXTRACT_VARS_KEY] || []
  }

  async saveAutoExtractVariables(variables: AutoExtractVariable[]): Promise<void> {
    await chrome.storage.local.set({ [AUTO_EXTRACT_VARS_KEY]: variables })
  }

  async addPresetVariable(variable: PresetVariable): Promise<void> {
    const vars = await this.getPresetVariables()
    vars.push(variable)
    await this.savePresetVariables(vars)
  }

  async updatePresetVariable(name: string, updates: Partial<PresetVariable>): Promise<void> {
    const vars = await this.getPresetVariables()
    const index = vars.findIndex(v => v.name === name)
    if (index !== -1) {
      vars[index] = { ...vars[index], ...updates }
      await this.savePresetVariables(vars)
    }
  }

  async deletePresetVariable(name: string): Promise<void> {
    const vars = await this.getPresetVariables()
    const filtered = vars.filter(v => v.name !== name)
    await this.savePresetVariables(filtered)
  }

  async addAutoExtractVariable(variable: AutoExtractVariable): Promise<void> {
    const vars = await this.getAutoExtractVariables()
    vars.push(variable)
    await this.saveAutoExtractVariables(vars)
  }

  async deleteAutoExtractVariable(name: string): Promise<void> {
    const vars = await this.getAutoExtractVariables()
    const filtered = vars.filter(v => v.name !== name)
    await this.saveAutoExtractVariables(filtered)
  }
}

export const variableStorage = new VariableStorage()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/variableStorage.ts
git commit -m "feat: add variable storage service"
```

---

## Task 4: 变量Store

**Files:**
- Create: `src/stores/variableStore.ts`

**Interfaces:**
- Consumes: `variableStorage` from Task 3
- Produces: `useVariableStore()` with `presetVariables`, `autoExtractVariables`, `loadVariables()`, `resolveVariable()`

- [ ] **Step 1: 创建变量Store**

```typescript
// src/stores/variableStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PresetVariable, AutoExtractVariable } from '@/types'
import { variableStorage } from '@/services/variableStorage'

export const useVariableStore = defineStore('variables', () => {
  const presetVariables = ref<PresetVariable[]>([])
  const autoExtractVariables = ref<AutoExtractVariable[]>([])
  
  // 运行时提取的变量值（从页面自动获取）
  const extractedValues = ref<Map<string, string>>(new Map())

  async function loadVariables(): Promise<void> {
    presetVariables.value = await variableStorage.getPresetVariables()
    autoExtractVariables.value = await variableStorage.getAutoExtractVariables()
  }

  async function addPresetVariable(variable: PresetVariable): Promise<void> {
    await variableStorage.addPresetVariable(variable)
    presetVariables.value.push(variable)
  }

  async function updatePresetVariable(name: string, updates: Partial<PresetVariable>): Promise<void> {
    await variableStorage.updatePresetVariable(name, updates)
    const index = presetVariables.value.findIndex(v => v.name === name)
    if (index !== -1) {
      presetVariables.value[index] = { ...presetVariables.value[index], ...updates }
    }
  }

  async function deletePresetVariable(name: string): Promise<void> {
    await variableStorage.deletePresetVariable(name)
    presetVariables.value = presetVariables.value.filter(v => v.name !== name)
  }

  async function addAutoExtractVariable(variable: AutoExtractVariable): Promise<void> {
    await variableStorage.addAutoExtractVariable(variable)
    autoExtractVariables.value.push(variable)
  }

  async function deleteAutoExtractVariable(name: string): Promise<void> {
    await variableStorage.deleteAutoExtractVariable(name)
    autoExtractVariables.value = autoExtractVariables.value.filter(v => v.name !== name)
  }

  // 解析变量引用 {{varName}} 或 {{auto:varName}}
  function resolveVariable(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      // 优先使用自动提取的值
      if (extractedValues.value.has(name)) {
        return extractedValues.value.get(name) || ''
      }
      // 其次使用预设变量
      const preset = presetVariables.value.find(v => v.name === name)
      if (preset) {
        return preset.value
      }
      // 变量未找到，返回空字符串
      console.warn('[Variables] Variable not found:', name)
      return ''
    })
  }

  // 从页面提取变量值（由content script调用）
  function setExtractedValue(name: string, value: string): void {
    extractedValues.value.set(name, value)
  }

  return {
    presetVariables,
    autoExtractVariables,
    extractedValues,
    loadVariables,
    addPresetVariable,
    updatePresetVariable,
    deletePresetVariable,
    addAutoExtractVariable,
    deleteAutoExtractVariable,
    resolveVariable,
    setExtractedValue
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/variableStore.ts
git commit -m "feat: add variable store with resolveVariable"
```

---

## Task 5: Body改写核心逻辑

**Files:**
- Create: `src/content/bodyRewriter.ts`

**Interfaces:**
- Consumes: `BodyRewriteAction` from Task 1
- Produces: `rewriteBody()`, `rewriteGetParams()`, `applyVariables()`

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
        { method: 'jsonPath', path: 'invalid', value: 'test' }, // 会失败，因为body不是有效JSON路径
        { method: 'text', find: '"status":0', replace: '"status":1' }
      ]
      const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
      // 第一个失败，第二个成功
      expect(result).toBe('{"status":1}')
    })
  })
  
  describe('rewriteGetParams', () => {
    it('should rewrite query params', () => {
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

## Task 6: 注入脚本（拦截fetch/XHR）

**Files:**
- Create: `src/content/injectedScript.ts`

**Interfaces:**
- Consumes: `rewriteBody`, `rewriteGetParams` from Task 5
- Produces: 完整的注入脚本代码

- [ ] **Step 1: 创建注入脚本**

```typescript
// src/content/injectedScript.ts

// 这个文件会被转换成字符串注入到页面上下文
// 注意：不能使用import，所有依赖需要内联

export const INJECTED_SCRIPT = `
(function() {
  'use strict'
  
  // 规则和变量存储
  let currentRules = []
  let variableMap = new Map()
  
  // 接收来自content script的消息
  window.addEventListener('message', function(event) {
    if (event.source !== window) return
    if (event.data.type === 'REQUEST_REWRITE_CONFIG') {
      currentRules = event.data.rules || []
      variableMap = new Map(Object.entries(event.data.variables || {}))
    }
  })
  
  // 请求配置
  window.postMessage({ type: 'REQUEST_REWRITE_GET_CONFIG' }, '*')
  
  // 变量解析
  function applyVariables(value) {
    return value.replace(/\\{\\{(\\w+)\\}\\}/g, function(_, name) {
      return variableMap.get(name) || ''
    })
  }
  
  // JSON路径设置
  function setByPath(obj, path, value) {
    var parts = path.split('.')
    var current = obj
    for (var i = 0; i < parts.length - 1; i++) {
      var part = parts[i]
      if (!current[part]) current[part] = {}
      current = current[part]
    }
    current[parts[parts.length - 1]] = value
  }
  
  // 应用单个改写
  function applySingleRewrite(body, rewrite, url, method) {
    try {
      switch (rewrite.method) {
        case 'text':
          if (!rewrite.find) return body
          return body.split(rewrite.find).join(rewrite.replace || '')
        case 'jsonPath':
          if (!rewrite.path || !rewrite.value) return body
          var json = JSON.parse(body)
          setByPath(json, rewrite.path, applyVariables(rewrite.value))
          return JSON.stringify(json)
        case 'regex':
          if (!rewrite.pattern) return body
          var regex = new RegExp(rewrite.pattern, 'g')
          return body.replace(regex, rewrite.replacement || '')
        case 'script':
          if (!rewrite.scriptBody) return body
          var fn = new Function('body', 'url', 'method', rewrite.scriptBody)
          return fn(body, url, method)
        default:
          return body
      }
    } catch (e) {
      console.error('[RequestRewrite] Rewrite error:', e)
      return body
    }
  }
  
  // 应用多个改写
  function applyRewrites(body, rewrites, url, method) {
    var result = body
    for (var i = 0; i < rewrites.length; i++) {
      result = applySingleRewrite(result, rewrites[i], url, method)
    }
    return result
  }
  
  // GET参数改写
  function rewriteGetParams(url, rewrites) {
    var parts = url.split('?')
    if (parts.length < 2) return url
    var baseUrl = parts[0]
    var queryString = parts.slice(1).join('?')
    var params = new URLSearchParams(queryString)
    
    for (var i = 0; i < rewrites.length; i++) {
      var rewrite = rewrites[i]
      try {
        if (rewrite.method === 'jsonPath' && rewrite.path) {
          if (params.has(rewrite.path)) {
            params.set(rewrite.path, applyVariables(rewrite.value || ''))
          }
        } else if (rewrite.method === 'text' && rewrite.find) {
          queryString = queryString.split(rewrite.find).join(rewrite.replace || '')
          params = new URLSearchParams(queryString)
        } else if (rewrite.method === 'regex' && rewrite.pattern) {
          var regex = new RegExp(rewrite.pattern, 'g')
          queryString = queryString.replace(regex, rewrite.replacement || '')
          params = new URLSearchParams(queryString)
        }
      } catch (e) {
        console.error('[RequestRewrite] GET rewrite error:', e)
      }
    }
    return baseUrl + '?' + params.toString()
  }
  
  // 匹配URL模式
  function matchUrlPattern(pattern, url) {
    if (pattern === '*://*/*') return true
    try {
      var urlObj = new URL(url)
      var schemePattern = pattern.split('://')[0]
      var hostPath = pattern.split('://')[1]
      var hostPattern = hostPath.split('/')[0]
      var pathPattern = '/' + hostPath.split('/').slice(1).join('/')
      
      // 检查scheme
      if (schemePattern !== '*' && schemePattern !== urlObj.protocol.replace(':', '')) {
        return false
      }
      
      // 检查host
      if (hostPattern === '*') {
        // 匹配所有
      } else if (hostPattern.startsWith('*.')) {
        var domain = hostPattern.slice(2)
        if (!urlObj.hostname.endsWith('.' + domain) && urlObj.hostname !== domain) {
          return false
        }
      } else if (hostPattern !== urlObj.hostname) {
        return false
      }
      
      // 检查path
      if (pathPattern === '/*' || pathPattern === '/') {
        return true
      }
      var pathRegex = new RegExp('^' + pathPattern.replace(/\\*/g, '.*') + '$')
      return pathRegex.test(urlObj.pathname)
    } catch (e) {
      return false
    }
  }
  
  // 查找匹配的规则
  function findMatchingRules(url, method) {
    var matched = []
    for (var i = 0; i < currentRules.length; i++) {
      var rule = currentRules[i]
      if (!rule.enabled) continue
      if (!matchUrlPattern(rule.urlPattern, url)) continue
      if (rule.methods.indexOf('ALL') === -1 && rule.methods.indexOf(method) === -1) continue
      matched.push(rule)
    }
    return matched
  }
  
  // 拦截fetch
  var originalFetch = window.fetch
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : input.url
    var method = (init && init.method) || 'GET'
    var rules = findMatchingRules(url, method.toUpperCase())
    
    if (rules.length > 0) {
      // 处理请求
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i]
        if (rule.target !== 'request') continue
        
        // GET参数改写
        if (method.toUpperCase() === 'GET' && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          url = rewriteGetParams(url, rule.bodyRewrites)
          if (typeof input === 'string') {
            input = url
          } else {
            input = new Request(url, init)
          }
        }
        
        // Body改写
        if (init && init.body && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          init.body = applyRewrites(init.body, rule.bodyRewrites, url, method)
        }
      }
    }
    
    return originalFetch.call(window, input, init).then(function(response) {
      // 处理响应
      var responseRules = rules.filter(function(r) { return r.target === 'response' })
      if (responseRules.length === 0) return response
      
      // 创建可改写的Response
      return response.text().then(function(text) {
        var modifiedText = text
        for (var i = 0; i < responseRules.length; i++) {
          var rule = responseRules[i]
          if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, url, method)
          }
        }
        return new Response(modifiedText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        })
      })
    })
  }
  
  // 拦截XMLHttpRequest
  var OriginalXHR = window.XMLHttpRequest
  window.XMLHttpRequest = function() {
    var xhr = new OriginalXHR()
    var _url, _method
    
    var originalOpen = xhr.open
    xhr.open = function(method, url) {
      _method = method
      _url = url
      return originalOpen.apply(xhr, arguments)
    }
    
    var originalSend = xhr.send
    xhr.send = function(body) {
      var rules = findMatchingRules(_url, _method.toUpperCase())
      
      if (rules.length > 0) {
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i]
          if (rule.target !== 'request') continue
          
          // GET参数改写
          if (_method.toUpperCase() === 'GET' && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            _url = rewriteGetParams(_url, rule.bodyRewrites)
            originalOpen.call(xhr, _method, _url)
          }
          
          // Body改写
          if (body && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            body = applyRewrites(body, rule.bodyRewrites, _url, _method)
          }
        }
      }
      
      // 拦截响应
      xhr.addEventListener('load', function() {
        var responseRules = rules.filter(function(r) { return r.target === 'response' })
        if (responseRules.length > 0) {
          var modifiedText = xhr.responseText
          for (var i = 0; i < responseRules.length; i++) {
            var rule = responseRules[i]
            if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
              modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, _url, _method)
            }
          }
          Object.defineProperty(xhr, 'responseText', { value: modifiedText })
          Object.defineProperty(xhr, 'response', { value: modifiedText })
        }
      })
      
      return originalSend.call(xhr, body)
    }
    
    return xhr
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

## Task 7: Content Script主入口

**Files:**
- Create: `src/content/index.ts`

**Interfaces:**
- Consumes: `INJECTED_SCRIPT` from Task 6
- Produces: 注入脚本到页面，与background通信获取规则

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

## Task 8: 新存储服务

**Files:**
- Create: `src/services/requestRewriteStorage.ts`
- Delete: `src/services/headerRuleStorage.ts` (迁移后删除)

**Interfaces:**
- Consumes: `RequestRewriteProfile` from Task 1, `checkAndMigrate` from Task 2
- Produces: `getProfiles()`, `saveProfiles()`, `getActiveProfileId()`, `setActiveProfileId()`

- [ ] **Step 1: 创建新存储服务**

```typescript
// src/services/requestRewriteStorage.ts

import type { RequestRewriteProfile } from '@/types'
import { checkAndMigrate } from './dataMigration'

const PROFILES_KEY = 'headerProfiles' // 保持key不变，兼容迁移
const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'

const DEFAULT_PROFILE: RequestRewriteProfile = {
  id: 'default',
  name: 'Default',
  enabled: true,
  rules: []
}

export class RequestRewriteStorage {
  async init(): Promise<void> {
    await checkAndMigrate()
  }

  async getProfiles(): Promise<RequestRewriteProfile[]> {
    const result = await chrome.storage.local.get(PROFILES_KEY)
    const profiles = result[PROFILES_KEY]
    if (!profiles || !Array.isArray(profiles)) {
      return [DEFAULT_PROFILE]
    }
    return profiles
  }

  async saveProfiles(profiles: RequestRewriteProfile[]): Promise<void> {
    const data = JSON.parse(JSON.stringify(profiles))
    await chrome.storage.local.set({ [PROFILES_KEY]: data })
    console.log('[RequestRewriteStorage] saved', profiles.length, 'profiles')
  }

  async getActiveProfileId(): Promise<string | null> {
    const result = await chrome.storage.local.get(ACTIVE_PROFILE_KEY)
    return result[ACTIVE_PROFILE_KEY] ?? null
  }

  async setActiveProfileId(profileId: string | null): Promise<void> {
    if (profileId) {
      await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: profileId })
    } else {
      await chrome.storage.local.remove(ACTIVE_PROFILE_KEY)
    }
  }

  async getActiveProfile(): Promise<RequestRewriteProfile | null> {
    const profiles = await this.getProfiles()
    const activeId = await this.getActiveProfileId()
    return profiles.find(p => p.id === activeId) ?? null
  }
}

export const requestRewriteStorage = new RequestRewriteStorage()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/requestRewriteStorage.ts
git commit -m "feat: add RequestRewrite storage service"
```

---

## Task 9: 更新Store

**Files:**
- Create: `src/stores/requestRewriteStore.ts`
- Delete: `src/stores/headerRuleStore.ts`

**Interfaces:**
- Consumes: `requestRewriteStorage` from Task 8, `headerRuleService` (现有)
- Produces: `useRequestRewriteStore()` with 完整CRUD操作

- [ ] **Step 1: 创建新Store**

```typescript
// src/stores/requestRewriteStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RequestRewriteProfile, RequestRewriteRule, HeaderAction, BodyRewriteAction } from '@/types'
import { requestRewriteStorage } from '@/services/requestRewriteStorage'
import { headerRuleService } from '@/services/headerRuleService'

export const useRequestRewriteStore = defineStore('requestRewrite', () => {
  const profiles = ref<RequestRewriteProfile[]>([])
  const activeProfileId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProfile = computed(() =>
    profiles.value.find(p => p.id === activeProfileId.value) ?? null
  )

  async function loadProfiles(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await requestRewriteStorage.init()
      profiles.value = await requestRewriteStorage.getProfiles()
      activeProfileId.value = await requestRewriteStorage.getActiveProfileId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
    } finally {
      loading.value = false
    }
  }

  async function saveProfiles(): Promise<void> {
    await requestRewriteStorage.saveProfiles(profiles.value)
  }

  async function setActiveProfile(profileId: string | null): Promise<void> {
    activeProfileId.value = profileId
    await requestRewriteStorage.setActiveProfileId(profileId)

    const profile = profiles.value.find(p => p.id === profileId) ?? null
    // 同步Headers规则到Chrome
    await headerRuleService.syncRulesToChrome(profile)
    
    // 通知content script规则已更新
    await notifyRulesUpdated()
  }

  async function notifyRulesUpdated(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ action: 'requestRewriteRulesUpdated' })
    } catch (e) {
      // 忽略错误，可能没有content script在监听
    }
  }

  async function createProfile(name: string): Promise<RequestRewriteProfile> {
    const profile: RequestRewriteProfile = {
      id: `profile-${Date.now()}`,
      name,
      enabled: true,
      rules: []
    }
    profiles.value.push(profile)
    await saveProfiles()
    return profile
  }

  async function updateProfile(profileId: string, updates: Partial<RequestRewriteProfile>): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value[index] = { ...profiles.value[index], ...updates }
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profiles.value[index])
        await notifyRulesUpdated()
      }
    }
  }

  async function deleteProfile(profileId: string): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value.splice(index, 1)
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await setActiveProfile(null)
      }
    }
  }

  async function addRule(profileId: string, rule: RequestRewriteRule): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules.push(rule)
      await saveProfiles()
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    }
  }

  async function updateRule(profileId: string, ruleId: string, updates: Partial<RequestRewriteRule>): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const index = profile.rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        profile.rules[index] = { ...profile.rules[index], ...updates }
        await saveProfiles()

        if (activeProfileId.value === profileId) {
          await headerRuleService.syncRulesToChrome(profile)
          await notifyRulesUpdated()
        }
      }
    }
  }

  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules = profile.rules.filter(r => r.id !== ruleId)
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    }
  }

  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const reorderedRules: RequestRewriteRule[] = []
      for (const id of ruleIds) {
        const rule = profile.rules.find(r => r.id === id)
        if (rule) reorderedRules.push(rule)
      }
      profile.rules = reorderedRules
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    }
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    loading,
    error,
    loadProfiles,
    saveProfiles,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    addRule,
    updateRule,
    deleteRule,
    reorderRules
  }
})

// 向后兼容的别名
export const useHeaderRuleStore = useRequestRewriteStore
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/requestRewriteStore.ts
git commit -m "feat: add RequestRewrite store with full CRUD operations"
```

---

## Task 10: 更新Background

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `requestRewriteStorage`, `variableStorage`
- Produces: 新增消息处理 `getRequestRewriteRules`

- [ ] **Step 1: 添加新消息处理**

在现有background中添加：

```typescript
// 在 src/background/index.ts 中添加

import { requestRewriteStorage } from '@/services/requestRewriteStorage'
import { variableStorage } from '@/services/variableStorage'

// 在现有消息处理中添加新case
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... 现有代码 ...

  if (message.action === 'getRequestRewriteRules') {
    ;(async () => {
      try {
        const profile = await requestRewriteStorage.getActiveProfile()
        const presetVars = await variableStorage.getPresetVariables()
        const autoExtractVars = await variableStorage.getAutoExtractVariables()
        
        // 转换变量为map格式
        const variables: Record<string, string> = {}
        for (const v of presetVars) {
          variables[v.name] = v.value
        }
        // autoExtractVars需要content script在页面中提取
        
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
    return true // 异步响应
  }

  // 处理规则更新通知
  if (message.action === 'requestRewriteRulesUpdated') {
    // 广播到所有tab
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

  // ... 其他现有代码 ...
})
```

- [ ] **Step 2: 提交**

```bash
git add src/background/index.ts
git commit -m "feat: add getRequestRewriteRules message handler in background"
```

---

## Task 11: 更新Manifest

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: 添加content_scripts配置**

```json
{
  "manifest_version": 3,
  "name": "Coffer",
  "version": "1.0.4",
  "description": "A secure vault for your cookies and storage - manage, copy, paste across tabs and incognito mode",
  "permissions": [
    "cookies",
    "storage",
    "activeTab",
    "tabs",
    "scripting",
    "clipboardRead",
    "clipboardWrite",
    "declarativeNetRequest",
    "declarativeNetRequestFeedback"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "devtools_page": "src/devtools/index.html",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "src/manager/index.html",
        "manager.js",
        "chunks/*",
        "assets/*"
      ],
      "matches": [
        "<all_urls>"
      ]
    }
  ],
  "incognito": "split"
}
```

- [ ] **Step 2: 更新vite.config.ts添加content.js入口**

```typescript
// 在vite.config.ts的build.rollupOptions.input中添加content入口
```

- [ ] **Step 3: 提交**

```bash
git add manifest.json
git commit -m "feat: add content_scripts to manifest"
```

---

## Task 12: UI组件 - Settings变量管理

**Files:**
- Modify: `src/devtools/components/SettingsPanel.vue`

**Interfaces:**
- Consumes: `useVariableStore` from Task 4

- [ ] **Step 1: 添加变量管理区域**

```vue
<!-- 在 src/devtools/components/SettingsPanel.vue 中扩展 -->
<template>
  <div class="p-4 space-y-4">
    <h3 class="text-lg font-semibold mb-4">Settings</h3>
    
    <!-- 现有设置 -->
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Persist Clipboard</div>
        <div class="text-sm text-gray-500">Save clipboard to storage</div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input v-model="persistMode" type="checkbox" class="sr-only peer" @change="handlePersistChange" />
        <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-chrome-blue rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-chrome-blue"></div>
      </label>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Max Clipboard Items</div>
        <div class="text-sm text-gray-500">Maximum saved clipboard items</div>
      </div>
      <input v-model.number="maxItems" type="number" min="1" max="50"
        class="w-20 px-2 py-1 border rounded" @change="handleMaxItemsChange" />
    </div>
    
    <!-- 变量管理 -->
    <div class="pt-4 border-t">
      <h4 class="font-medium mb-3">Variables</h4>
      
      <!-- 预设变量 -->
      <div class="mb-4">
        <div class="text-sm text-gray-600 mb-2">Preset Variables</div>
        <div class="space-y-2">
          <div v-for="v in variableStore.presetVariables" :key="v.name"
            class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span class="font-mono text-sm flex-1">{{ v.name }}</span>
            <span class="text-sm text-gray-500 flex-1 truncate">{{ v.value }}</span>
            <button @click="editPresetVar(v)" class="text-blue-500 text-sm hover:underline">Edit</button>
            <button @click="deletePresetVar(v.name)" class="text-red-500 text-sm hover:underline">Del</button>
          </div>
          <button @click="showAddPresetVar = true" class="text-sm text-blue-500 hover:underline">+ Add Variable</button>
        </div>
      </div>
      
      <!-- 自动提取变量 -->
      <div>
        <div class="text-sm text-gray-600 mb-2">Auto Extract Variables</div>
        <div class="space-y-2">
          <div v-for="v in variableStore.autoExtractVariables" :key="v.name"
            class="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span class="font-mono text-sm flex-1">{{ v.name }}</span>
            <span class="text-xs text-gray-500">{{ v.source }}: {{ v.key }}</span>
            <button @click="deleteAutoVar(v.name)" class="text-red-500 text-sm hover:underline">Del</button>
          </div>
          <button @click="showAddAutoVar = true" class="text-sm text-blue-500 hover:underline">+ Add Auto Extract</button>
        </div>
      </div>
    </div>
    
    <div class="pt-4 border-t">
      <button @click="$emit('close')" class="w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
    </div>
    
    <!-- 添加预设变量弹窗 -->
    <div v-if="showAddPresetVar" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showAddPresetVar = false">
      <div class="bg-white rounded-lg p-4 w-80">
        <h4 class="font-medium mb-3">{{ editingVar ? 'Edit Variable' : 'Add Variable' }}</h4>
        <input v-model="presetVarForm.name" placeholder="Variable name" class="w-full px-3 py-2 border rounded mb-2" />
        <input v-model="presetVarForm.value" placeholder="Variable value" class="w-full px-3 py-2 border rounded mb-2" />
        <div class="flex justify-end gap-2">
          <button @click="cancelPresetVar" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="savePresetVar" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
        </div>
      </div>
    </div>
    
    <!-- 添加自动提取变量弹窗 -->
    <div v-if="showAddAutoVar" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showAddAutoVar = false">
      <div class="bg-white rounded-lg p-4 w-80">
        <h4 class="font-medium mb-3">Add Auto Extract Variable</h4>
        <input v-model="autoVarForm.name" placeholder="Variable name" class="w-full px-3 py-2 border rounded mb-2" />
        <select v-model="autoVarForm.source" class="w-full px-3 py-2 border rounded mb-2">
          <option value="localStorage">localStorage</option>
          <option value="sessionStorage">sessionStorage</option>
          <option value="cookie">cookie</option>
        </select>
        <input v-model="autoVarForm.key" placeholder="Storage key" class="w-full px-3 py-2 border rounded mb-2" />
        <div class="flex justify-end gap-2">
          <button @click="showAddAutoVar = false" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="saveAutoVar" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useSettingStore } from '@/stores/settingStore'
import { useVariableStore } from '@/stores/variableStore'
import type { PresetVariable, AutoExtractVariable } from '@/types'

defineEmits<{ close: [] }>()
const settingStore = useSettingStore()
const variableStore = useVariableStore()

const persistMode = ref(false)
const maxItems = ref(10)

const showAddPresetVar = ref(false)
const showAddAutoVar = ref(false)
const editingVar = ref<PresetVariable | null>(null)

const presetVarForm = reactive({ name: '', value: '' })
const autoVarForm = reactive({ name: '', source: 'localStorage' as const, key: '' })

onMounted(async () => {
  await settingStore.load()
  persistMode.value = settingStore.persistMode
  maxItems.value = settingStore.maxClipboardItems
  await variableStore.loadVariables()
})

async function handlePersistChange() {
  settingStore.updateSettings({ persistMode: persistMode.value })
  await settingStore.save()
}

async function handleMaxItemsChange() {
  settingStore.updateSettings({ maxClipboardItems: maxItems.value })
  await settingStore.save()
}

function editPresetVar(v: PresetVariable) {
  editingVar.value = v
  presetVarForm.name = v.name
  presetVarForm.value = v.value
  showAddPresetVar.value = true
}

function cancelPresetVar() {
  showAddPresetVar.value = false
  editingVar.value = null
  presetVarForm.name = ''
  presetVarForm.value = ''
}

async function savePresetVar() {
  if (!presetVarForm.name.trim()) return
  
  if (editingVar.value) {
    await variableStore.updatePresetVariable(editingVar.value.name, {
      name: presetVarForm.name,
      value: presetVarForm.value
    })
  } else {
    await variableStore.addPresetVariable({
      name: presetVarForm.name,
      value: presetVarForm.value
    })
  }
  cancelPresetVar()
}

async function deletePresetVar(name: string) {
  await variableStore.deletePresetVariable(name)
}

async function saveAutoVar() {
  if (!autoVarForm.name.trim() || !autoVarForm.key.trim()) return
  await variableStore.addAutoExtractVariable({
    name: autoVarForm.name,
    source: autoVarForm.source,
    key: autoVarForm.key
  })
  showAddAutoVar.value = false
  autoVarForm.name = ''
  autoVarForm.key = ''
}

async function deleteAutoVar(name: string) {
  await variableStore.deleteAutoExtractVariable(name)
}
</script>
```

- [ ] **Step 2: 提交**

```bash
git add src/devtools/components/SettingsPanel.vue
git commit -m "feat: add variable management to SettingsPanel"
```

---

## Task 13: UI组件 - 规则编辑器改造

**Files:**
- Rename: `src/manager/components/HeadersManager.vue` → `src/manager/components/RequestRewriteManager.vue`

**注意：** 这是一个大型任务，需要重构现有组件以支持新的组合规则结构和Body改写配置。

由于篇幅限制，这个任务的完整代码在后续任务中分解。本任务先完成组件重命名和基础结构调整。

- [ ] **Step 1: 重命名组件文件**

```bash
mv src/manager/components/HeadersManager.vue src/manager/components/RequestRewriteManager.vue
```

- [ ] **Step 2: 更新导入**

在 `src/manager/App.vue`, `src/devtools/App.vue`, `src/popup/App.vue` 中更新导入：

```typescript
// 将
import HeadersManager from '@/manager/components/HeadersManager.vue'
// 改为
import RequestRewriteManager from '@/manager/components/RequestRewriteManager.vue'
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "refactor: rename HeadersManager to RequestRewriteManager"
```

---

## Task 14: UI组件 - 规则编辑弹窗改造

**Files:**
- Modify: `src/manager/components/RequestRewriteManager.vue`

**目标：** 将规则编辑弹窗改造为Tab切换结构，支持Headers和Body两种配置。

- [ ] **Step 1: 添加Tab切换结构**

在规则编辑弹窗中，将现有的表单内容收纳到Tab结构中：

```vue
<!-- 规则编辑弹窗部分 -->
<div v-if="showNewRuleModal || editingRule" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeRuleModal">
  <div class="bg-white rounded-lg p-4 w-[500px] max-h-[80vh] overflow-auto">
    <h3 class="text-lg font-semibold mb-3">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>

    <!-- 基础配置 -->
    <div class="space-y-3 mb-4">
      <div>
        <label class="block text-sm font-medium mb-1">Rule Name</label>
        <input v-model="ruleForm.name" type="text" class="w-full px-3 py-2 border rounded" />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">URL Pattern</label>
        <div class="flex items-center gap-2">
          <input v-model="ruleForm.urlPattern" type="text" placeholder="*://api.example.com/*" class="flex-1 px-3 py-2 border rounded" />
          <button @click="showPatternTestModal = true" class="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded" title="Test URL Pattern">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">HTTP Methods</label>
        <div class="flex flex-wrap gap-2">
          <label v-for="m in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="m" class="flex items-center gap-1">
            <input type="checkbox" :value="m" v-model="ruleForm.methods" />
            <span class="text-sm">{{ m }}</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Target</label>
        <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
          <option value="request">Request</option>
          <option value="response">Response</option>
        </select>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
      <button 
        @click="ruleEditTab = 'headers'" 
        :class="['flex-1 py-1.5 text-sm rounded-md transition-colors', ruleEditTab === 'headers' ? 'bg-white shadow' : 'hover:bg-gray-50']">
        Headers ({{ ruleForm.headers.length }})
      </button>
      <button 
        @click="ruleEditTab = 'body'" 
        :class="['flex-1 py-1.5 text-sm rounded-md transition-colors', ruleEditTab === 'body' ? 'bg-white shadow' : 'hover:bg-gray-50']">
        Body ({{ ruleForm.bodyRewrites.length }})
      </button>
    </div>

    <!-- Headers配置 -->
    <div v-if="ruleEditTab === 'headers'" class="space-y-2 mb-4">
      <div v-for="(header, idx) in ruleForm.headers" :key="idx" class="flex items-center gap-2 p-2 bg-gray-50 rounded">
        <select v-model="header.action" class="px-2 py-1 border rounded text-sm">
          <option value="add">Add</option>
          <option value="modify">Modify</option>
          <option value="remove">Remove</option>
        </select>
        <input v-model="header.headerName" placeholder="Header Name" class="flex-1 px-2 py-1 border rounded text-sm" />
        <input v-if="header.action !== 'remove'" v-model="header.headerValue" placeholder="Value" class="flex-1 px-2 py-1 border rounded text-sm" />
        <button @click="ruleForm.headers.splice(idx, 1)" class="text-red-500 text-sm hover:underline">✕</button>
      </div>
      <button @click="ruleForm.headers.push({ action: 'add', headerName: '', headerValue: '' })" class="text-sm text-blue-500 hover:underline">+ Add Header</button>
    </div>

    <!-- Body配置 -->
    <div v-else class="space-y-3 mb-4">
      <div v-for="(rewrite, idx) in ruleForm.bodyRewrites" :key="idx" class="p-3 bg-gray-50 rounded border">
        <div class="flex items-center gap-2 mb-2">
          <select v-model="rewrite.method" class="px-2 py-1 border rounded text-sm">
            <option value="text">Text</option>
            <option value="jsonPath">JSON Path</option>
            <option value="regex">Regex</option>
            <option value="script">Script</option>
          </select>
          <button @click="ruleForm.bodyRewrites.splice(idx, 1)" class="ml-auto text-red-500 text-sm hover:underline">✕</button>
        </div>
        
        <!-- Text方式 -->
        <template v-if="rewrite.method === 'text'">
          <input v-model="rewrite.find" placeholder="Find" class="w-full px-2 py-1 border rounded text-sm mb-2" />
          <input v-model="rewrite.replace" placeholder="Replace" class="w-full px-2 py-1 border rounded text-sm" />
        </template>
        
        <!-- JSON Path方式 -->
        <template v-else-if="rewrite.method === 'jsonPath'">
          <input v-model="rewrite.path" placeholder="Path (e.g. data.token)" class="w-full px-2 py-1 border rounded text-sm mb-2" />
          <input v-model="rewrite.value" placeholder="Value (use {{varName}} for variables)" class="w-full px-2 py-1 border rounded text-sm" />
        </template>
        
        <!-- Regex方式 -->
        <template v-else-if="rewrite.method === 'regex'">
          <div class="flex items-center gap-2 mb-2">
            <input v-model="rewrite.pattern" placeholder="Pattern" class="flex-1 px-2 py-1 border rounded text-sm" />
            <button @click="openRegexTest(idx)" class="p-1 text-gray-500 hover:text-blue-500 rounded" title="Test Regex">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <input v-model="rewrite.replacement" placeholder="Replacement" class="w-full px-2 py-1 border rounded text-sm" />
        </template>
        
        <!-- Script方式 -->
        <template v-else-if="rewrite.method === 'script'">
          <textarea v-model="rewrite.scriptBody" rows="5" placeholder="function modify(body, url, method) { ... }" class="w-full px-2 py-1 border rounded text-sm font-mono"></textarea>
        </template>
      </div>
      <button @click="addBodyRewrite" class="text-sm text-blue-500 hover:underline">+ Add Rewrite</button>
    </div>

    <div class="flex justify-end gap-2">
      <button @click="closeRuleModal" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
      <button @click="saveRule" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 更新script部分**

```typescript
// 在script setup中更新

const ruleEditTab = ref<'headers' | 'body'>('headers')

const ruleForm = ref({
  name: '',
  urlPattern: '*://*/*',
  methods: ['ALL'] as HttpMethod[],
  target: 'request' as HeaderTarget,
  headers: [{ action: 'add' as const, headerName: '', headerValue: '' }],
  bodyRewrites: [] as BodyRewriteAction[]
})

function addBodyRewrite() {
  ruleForm.value.bodyRewrites.push({
    method: 'text',
    find: '',
    replace: ''
  })
}

function resetRuleForm() {
  ruleForm.value = {
    name: '',
    urlPattern: '*://*/*',
    methods: ['ALL'],
    target: 'request',
    headers: [{ action: 'add', headerName: '', headerValue: '' }],
    bodyRewrites: []
  }
  ruleEditTab.value = 'headers'
}

// 更新editRule函数
function editRule(rule: RequestRewriteRule) {
  editingRule.value = rule
  ruleForm.value = {
    name: rule.name,
    urlPattern: rule.urlPattern,
    methods: [...rule.methods],
    target: rule.target,
    headers: rule.headers.length > 0 ? [...rule.headers] : [{ action: 'add', headerName: '', headerValue: '' }],
    bodyRewrites: [...rule.bodyRewrites]
  }
  ruleEditTab.value = 'headers'
}

// 更新saveRule函数
async function saveRule() {
  if (!activeProfile.value) {
    showMessage('Please select a profile first', 'error')
    return
  }
  if (!ruleForm.value.name) {
    showMessage('Rule name is required', 'error')
    return
  }

  try {
    const ruleData: RequestRewriteRule = {
      id: editingRule.value?.id ?? `rule-${Date.now()}`,
      enabled: editingRule.value?.enabled ?? true,
      name: ruleForm.value.name,
      urlPattern: ruleForm.value.urlPattern,
      methods: ruleForm.value.methods,
      target: ruleForm.value.target,
      headers: ruleForm.value.headers.filter(h => h.headerName),
      bodyRewrites: ruleForm.value.bodyRewrites
    }

    if (editingRule.value) {
      await store.updateRule(activeProfile.value.id, editingRule.value.id, ruleData)
      showMessage('Rule updated')
    } else {
      await store.addRule(activeProfile.value.id, ruleData)
      showMessage('Rule created')
    }

    closeRuleModal()
  } catch (e) {
    console.error('saveRule error:', e)
    showMessage('Failed to save rule: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/manager/components/RequestRewriteManager.vue
git commit -m "feat: refactor rule editor with Headers/Body tabs"
```

---

## Task 15: Tab名称全局更新

**Files:**
- Modify: `src/popup/App.vue`
- Modify: `src/manager/App.vue`
- Modify: `src/devtools/App.vue`
- Modify: `src/manager/components/TabNav.vue`
- Modify: `src/popup/components/StatusCard.vue`
- Modify: `src/popup/components/QuickActions.vue`

- [ ] **Step 1: 更新所有文件中的"Headers"为"RequestRewrite"**

搜索并替换所有出现的"Headers"（在Tab上下文中）为"RequestRewrite"。

关键修改：
- Tab标签显示文字：`Headers` → `RequestRewrite`
- Tab值：`headers` → `requestRewrite`
- 相关的computed和变量名

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "refactor: rename Headers tab to RequestRewrite globally"
```

---

## Task 16: 集成测试和构建

**Files:**
- Modify: `vite.config.ts` (添加content入口)

- [ ] **Step 1: 更新vite配置添加content入口**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        devtools: resolve(__dirname, 'src/devtools/index.html'),
        manager: resolve(__dirname, 'src/manager/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
})
```

- [ ] **Step 2: 运行构建**

Run: `npm run build`
Expected: 构建成功，生成所有入口文件

- [ ] **Step 3: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: add content script entry to vite config"
```

---

## Task 17: 最终验证和清理

**目标：** 确保所有功能正常，清理废弃文件

- [ ] **Step 1: 删除废弃文件**

```bash
rm src/services/headerRuleStorage.ts
rm src/stores/headerRuleStore.ts
rm src/types/headerRule.ts
```

- [ ] **Step 2: 更新所有导入**

确保所有文件使用新的类型和store：
- `import type { ... } from '@/types/requestRewrite'`
- `import { useRequestRewriteStore } from '@/stores/requestRewriteStore'`

- [ ] **Step 3: 手动测试清单**

1. 创建Profile并添加规则
2. 添加Header改写规则，验证请求/响应header是否被修改
3. 添加Body改写规则（text/jsonPath/regex/script），验证请求body是否被修改
4. 添加Body改写规则，验证响应body是否被修改
5. GET请求参数改写测试
6. 变量创建和使用测试
7. 数据迁移测试（使用旧数据）
8. 规则导入导出测试

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "chore: cleanup deprecated files and finalize RequestRewrite feature"
```

---

**计划完成，保存到 `docs/superpowers/plans/2026-06-26-request-rewrite-implementation.md`**
