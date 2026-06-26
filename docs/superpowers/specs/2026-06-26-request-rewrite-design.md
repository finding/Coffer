# RequestRewrite 功能设计文档

> **目标：** 扩展现有Headers改写功能，新增Body改写能力，支持请求/响应体的多种改写方式

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    RequestRewrite                        │
├─────────────────────────────────────────────────────────┤
│  Headers改写 → declarativeNetRequest API（保持现有）     │
│  Body改写    → content_script 注入拦截 fetch/XHR        │
│  变量管理    → Settings面板（全局）                       │
└─────────────────────────────────────────────────────────┘
```

**混合架构说明**：
- Headers改写保持使用`declarativeNetRequest` API，高性能、声明式
- Body改写使用Content Script注入页面上下文拦截fetch/XHR
- 两者共用Profile管理和规则配置

---

## 2. 规则数据结构

### 2.1 主结构

```typescript
interface RequestRewriteRule {
  id: string
  name: string
  enabled: boolean
  urlPattern: string        // 匹配URL（支持通配符）
  methods: HttpMethod[]     // 匹配HTTP方法
  target: 'request' | 'response'
  
  headers: HeaderAction[]           // Header改写操作列表
  bodyRewrites: BodyRewriteAction[] // Body改写操作列表
}
```

### 2.2 Header操作

```typescript
interface HeaderAction {
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string      // remove时可为空
}
```

### 2.3 Body改写操作

```typescript
interface BodyRewriteAction {
  method: 'text' | 'jsonPath' | 'regex' | 'script'
  
  // text方式 - 简单文本替换
  find?: string
  replace?: string
  
  // jsonPath方式 - JSON路径改写
  path?: string           // 如 "data.token"、"items[0].id"
  value?: string          // 支持变量引用 {{varName}}
  
  // regex方式 - 正则表达式替换
  pattern?: string
  replacement?: string
  
  // script方式 - 自定义脚本
  scriptBody?: string     // 函数体代码
}
```

### 2.4 Profile结构

```typescript
interface RequestRewriteProfile {
  id: string
  name: string
  enabled: boolean
  rules: RequestRewriteRule[]
}
```

---

## 3. Body改写方式详解

### 3.1 Text文本替换

最简单的改写方式，直接查找替换字符串。

```json
{
  "method": "text",
  "find": "\"status\":0",
  "replace": "\"status\":1"
}
```

### 3.2 JSON路径改写

通过路径定位JSON字段进行替换。

```json
{
  "method": "jsonPath",
  "path": "data.token",
  "value": "{{myToken}}"
}
```

支持路径示例：
- `data.token` - 对象属性
- `items[0].id` - 数组索引
- `users[*].name` - 数组所有元素（批量替换）

### 3.3 Regex正则替换

使用正则表达式进行灵活匹配和替换。

```json
{
  "method": "regex",
  "pattern": "\"token\":\"[^\"]+\"",
  "replacement": "\"token\":\"new_token_value\""
}
```

**测试功能**：配置界面旁边提供测试图标，点击后可输入测试文本，显示正则匹配结果（匹配部分高亮显示）。

### 3.4 Script自定义脚本

允许用户编写JS函数处理body，最灵活。

```javascript
// 用户编写的函数体
function modify(body, url, method) {
  const json = JSON.parse(body)
  json.token = 'new_token_' + Date.now()
  return JSON.stringify(json)
}
```

**沙箱执行**：
- 使用`new Function()`创建函数
- 限制上下文，只能访问传入参数
- 无法访问DOM、fetch、XMLHttpRequest等

---

## 4. 变量系统

### 4.1 预设变量

用户手动定义的变量，存储在chrome.storage。

```typescript
interface PresetVariable {
  name: string         // 变量名，如 "myToken"
  value: string        // 变量值
  description?: string // 可选描述
}
```

### 4.2 自动提取变量

从页面自动提取的变量值。

```typescript
interface AutoExtractVariable {
  name: string         // 变量名
  source: 'localStorage' | 'sessionStorage' | 'cookie' | 'meta'
  key: string          // 存储的key
}
```

### 4.3 变量引用

在规则配置中使用变量：

```
{{myToken}}           // 引用预设变量
{{auto:tokenFromLS}}  // 引用自动提取变量
```

### 4.4 变量优先级

同名变量冲突时：自动提取变量 > 预设变量

---

## 5. 请求改写流程

### 5.1 GET请求参数改写

GET请求没有body，参数在URL查询字符串中。

```javascript
function rewriteGetParams(url: string, bodyRewrites: BodyRewriteAction[]): string {
  const [baseUrl, queryString] = url.split('?')
  if (!queryString) return url
  
  const params = new URLSearchParams(queryString)
  
  for (const rewrite of bodyRewrites) {
    // 应用各种改写方式
  }
  
  return `${baseUrl}?${params.toString()}`
}
```

### 5.2 POST/PUT/PATCH请求Body改写

```javascript
function rewriteRequestBody(body: string, url: string, method: string, 
                             bodyRewrites: BodyRewriteAction[]): string {
  let currentBody = body
  
  for (const rewrite of bodyRewrites) {
    try {
      switch (rewrite.method) {
        case 'text':
          currentBody = currentBody.replace(rewrite.find, rewrite.replace)
          break
        case 'jsonPath':
          const json = JSON.parse(currentBody)
          setByPath(json, rewrite.path, applyVariables(rewrite.value))
          currentBody = JSON.stringify(json)
          break
        case 'regex':
          const regex = new RegExp(rewrite.pattern, 'g')
          currentBody = currentBody.replace(regex, rewrite.replacement)
          break
        case 'script':
          const modifyFn = new Function('body', 'url', 'method', rewrite.scriptBody)
          currentBody = modifyFn(currentBody, url, method)
          break
      }
    } catch (e) {
      console.error('[RequestRewrite] Rewrite error:', e, rewrite)
      // 继续执行后续改写，返回当前body
    }
  }
  
  return currentBody
}
```

---

## 6. 响应改写流程

### 6.1 拦截Response读取

```javascript
// 拦截fetch响应
const originalFetch = window.fetch
window.fetch = async (url, options) => {
  const response = await originalFetch(url, options)
  
  // 创建可改写的Response
  return new RewritableResponse(response, url)
}

class RewritableResponse extends Response {
  constructor(originalResponse, url) {
    // 缓存原始body
    this._cachedBody = null
    this._url = url
    super(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers
    })
  }
  
  async text() {
    if (!this._cachedBody) {
      this._cachedBody = await super.text()
    }
    // 应用响应body改写规则
    return applyResponseRewrites(this._cachedBody, this._url)
  }
  
  async json() {
    const modifiedText = await this.text()
    return JSON.parse(modifiedText)
  }
}
```

### 6.2 拦截XMLHttpRequest

```javascript
const originalXHR = window.XMLHttpRequest
window.XMLHttpRequest = function() {
  const xhr = new originalXHR()
  
  // 拦截send
  const originalSend = xhr.send
  xhr.send = function(body) {
    // 应用请求body改写
    if (body) {
      body = applyRequestRewrites(body, this._url, this._method)
    }
    return originalSend.call(xhr, body)
  }
  
  // 拦截响应
  const originalOnReadyStateChange = xhr.onreadystatechange
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      // 应用响应body改写
      Object.defineProperty(xhr, 'responseText', {
        value: applyResponseRewrites(xhr.responseText, xhr._url)
      })
      Object.defineProperty(xhr, 'response', {
        value: applyResponseRewrites(xhr.response, xhr._url)
      })
    }
    if (originalOnReadyStateChange) {
      originalOnReadyStateChange.call(xhr)
    }
  }
  
  return xhr
}
```

---

## 7. UI设计

### 7.1 Tab名称变更

| 位置 | 旧名称 | 新名称 |
|------|--------|--------|
| Popup | Headers | RequestRewrite |
| Manager | Headers | RequestRewrite |
| DevTools | Headers | RequestRewrite |

### 7.2 规则列表显示

```
┌──────────────────────────────────────────────────────────────┐
│ [✓] rule.name │ Headers(2) Body(3) │ urlPattern · GET,POST │ [Edit][Del] │
└──────────────────────────────────────────────────────────────┘
```

- 显示改写操作数量而非具体内容
- 启用状态用Switch开关控制

### 7.3 规则编辑弹窗布局

```
┌─────────────────────────────────────────────┐
│ Edit Rule                                   │
├─────────────────────────────────────────────┤
│ Rule Name: [                            ]   │
│ URL Pattern: [                        ] ✓  │
│ Methods: [ALL] [GET] [POST] [PUT] [DEL] [PATCH]
│ Target: [request ▼]                        │
├─────────────────────────────────────────────┤
│ [Headers] [Body] ← Tab切换                  │
├─────────────────────────────────────────────┤
│ Headers配置区:                              │
│ ┌─────────────────────────────────────────┐ │
│ │ [▼add] [Authorization    ] [Bearer...] [X]
│ │ [▼modify] [Content-Type  ] [app/json] [X]
│ │                        [+ Add Header]   │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Body配置区（Body Tab选中时）:               │
│ ┌─────────────────────────────────────────┐ │
│ │ Method: [▼ text]                        │ │
│ │ Find: [                             ]   │ │
│ │ Replace: [                          ]   │ │
│ │                                    [X]  │ │
│ ├─────────────────────────────────────────┤ │
│ │ Method: [▼ jsonPath]                    │ │
│ │ Path: [data.token        ]              │ │
│ │ Value: [{{myToken}}       ]             │ │
│ │                                    [X]  │ │
│ ├─────────────────────────────────────────┤ │
│ │ Method: [▼ regex] [              ] ✓    │ │
│ │ Pattern: ["token":"[^"]*"]             │ │
│ │ Replacement: ["token":"new_val"]        │ │
│ │                                    [X]  │ │
│ ├─────────────────────────────────────────┤ │
│ │ Method: [▼ script]                     │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ function modify(body, url, method) { │ │ │
│ │ │   const json = JSON.parse(body)      │ │ │
│ │ │   json.token = 'new_token'           │ │ │
│ │ │   return JSON.stringify(json)        │ │ │
│ │ │ }                                    │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ │                                    [X]  │ │
│ │                     [+ Add Rewrite]     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│              [Cancel] [Save]                │
└─────────────────────────────────────────────┘
```

### 7.4 Settings面板变量区域

```
┌─────────────────────────────────────────────┐
│ Variables                                   │
├─────────────────────────────────────────────┤
│ Preset Variables:                           │
│ ┌─────────────────────────────────────────┐ │
│ │ myToken     │ abc123        │ [Edit][Del]
│ │ apiKey      │ key456        │ [Edit][Del]
│ └─────────────────────────────────────────┘ │
│ [+ Add Variable]                            │
│                                             │
│ Auto Extract Variables:                    │
│ ┌─────────────────────────────────────────┐ │
│ │ tokenFromLS │ localStorage │ token │ [Edit][Del]
│ │ sessionId   │ cookie      │ sid   │ [Edit][Del]
│ └─────────────────────────────────────────┘ │
│ [+ Add Auto Extract]                       │
└─────────────────────────────────────────────┘
```

---

## 8. 错误处理

### 8.1 处理策略

```javascript
function applyRewrite(body, rewrite, url, method) {
  try {
    switch (rewrite.method) {
      // ... 各种改写方式
    }
    return { success: true, body: newBody }
  } catch (e) {
    console.error('[RequestRewrite] Error in rewrite:', {
      rule: rewrite,
      error: e.message,
      stack: e.stack,
      url: url,
      method: method
    })
    return { success: false, body: body } // 返回原始body
  }
}
```

### 8.2 错误类型处理

| 错误类型 | 处理方式 |
|---------|---------|
| 脚本语法错误 | 记录日志，跳过此改写，继续后续改写 |
| 脚本运行时错误 | 记录日志，跳过此改写，继续后续改写 |
| JSON解析错误 | 记录日志，跳过此改写，继续后续改写 |
| 正则表达式无效 | 记录日志，跳过此改写，继续后续改写 |
| 变量未找到 | 使用空字符串替换，记录警告 |

**关键原则**：
- 单个改写失败 → 返回上一步改写后的body，继续执行后续改写
- 整体处理失败 → 返回原始body，不中断用户请求
- 所有错误记录详细日志供调试

---

## 9. 数据迁移

### 9.1 旧数据结构

```typescript
interface OldHeaderRule {
  id: string
  name: string
  enabled: boolean
  urlPattern: string
  methods: HttpMethod[]
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
  target: 'request' | 'response'
}
```

### 9.2 迁移函数

```typescript
const STORAGE_VERSION = 2  // v1=旧结构, v2=新结构

function migrateRule(old: OldHeaderRule): RequestRewriteRule {
  return {
    id: old.id,
    name: old.name,
    enabled: old.enabled,
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

async function migrateData() {
  const result = await chrome.storage.local.get(['headerProfiles', 'storageVersion'])
  const version = result.storageVersion || 1
  
  if (version < 2) {
    const oldProfiles = result.headerProfiles || []
    const newProfiles = oldProfiles.map(profile => ({
      ...profile,
      rules: profile.rules.map(migrateRule)
    }))
    
    await chrome.storage.local.set({
      headerProfiles: newProfiles,
      storageVersion: 2
    })
    
    console.log('[RequestRewrite] Migrated data to v2')
  }
}
```

---

## 10. Manifest配置

```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "storage",
    "scripting",
    "activeTab"
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content/index.ts"],
    "run_at": "document_start",
    "all_frames": true
  }]
}
```

---

## 11. 技术限制说明

| 场景 | 能否改写 | 说明 |
|------|---------|------|
| fetch请求 | ✅ | 注入脚本拦截 |
| XMLHttpRequest | ✅ | 注入脚本拦截 |
| Axios请求 | ✅ | Axios底层使用XHR或fetch |
| script标签加载 | ❌ | 浏览器直接加载，无法拦截 |
| img/link等资源 | ❌ | 浏览器直接加载 |
| WebSocket | ❌ | 暂不支持（后续可扩展） |

---

## 12. 未来扩展

- 从其他请求获取变量值（需先调用API获取token）
- WebSocket消息改写
- GraphQL请求特殊处理
- 规则导入导出增强（支持变量）

---

**设计版本：** v1.0  
**创建日期：** 2026-06-26  
**作者：** Claude Opus 4.7
